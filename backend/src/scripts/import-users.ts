import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { Client } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import tar from "tar-stream";
import { env } from "../config/env";

const expectedColumns = ["id", "name", "email", "phone"];
const MB = 1024 * 1024;
let client: Client | undefined;
let tempDir: string | undefined;
let monitor: NodeJS.Timeout | undefined;

type Options = { dryRun: boolean; allowProduction: boolean; limit?: number };
type Stats = {
  loaded: number;
  invalid: number;
  duplicates: number;
  existing: number;
  inserted: number;
  ignored: number;
};

const log = (message: string) =>
  console.log(`${new Date().toISOString()} ${message}`);
const number = (value: number) => value.toLocaleString("pt-BR");

function readOptions(): Options {
  const options: Options = { dryRun: false, allowProduction: false };
  for (const argument of process.argv.slice(2)) {
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--allow-production") options.allowProduction = true;
    else if (argument.startsWith("--limit=")) {
      options.limit = Number(argument.slice(8));
      if (!Number.isSafeInteger(options.limit) || options.limit < 1)
        throw new Error("--limit inválido");
    } else throw new Error(`Opção desconhecida: ${argument}`);
  }
  return options;
}

function findArchive(): string {
  const candidates = [
    path.resolve("data/users.csv.tgz"),
    path.resolve("backend/data/users.csv.tgz"),
  ];
  const archive = candidates.find(fs.existsSync);
  if (!archive) throw new Error(`Arquivo ausente: ${candidates.join(" ou ")}`);
  return archive;
}

function safeArchivePath(name: string): string {
  const normalized = path.posix.normalize(name.replace(/\\/g, "/"));
  if (
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`Path traversal no TGZ: ${name}`);
  }
  return normalized;
}

async function extractCsv(
  archive: string,
  output: string,
  limit?: number,
): Promise<void> {
  const extractor = tar.extract();
  let csvEntries = 0;
  const writes: Promise<void>[] = [];

  extractor.on("entry", (header, stream, next) => {
    const name = safeArchivePath(header.name);
    if (header.type !== "file" || !name.toLowerCase().endsWith(".csv")) {
      stream.on("end", next);
      stream.resume();
      return;
    }
    csvEntries += 1;
    if (csvEntries > 1) {
      extractor.destroy(new Error("O TGZ deve conter exatamente um CSV"));
      return;
    }
    const target = fs.createWriteStream(output, { flags: "wx" });
    let work: Promise<void>;
    if (limit) {
      let rows = 0;
      const take = new Transform({
        objectMode: true,
        transform(record, _encoding, done) {
          rows += 1;
          done(null, rows <= limit + 1 ? record : undefined);
        },
      });
      work = pipeline(stream, parse({ bom: true }), take, stringify(), target);
    } else {
      work = pipeline(stream, target);
    }
    writes.push(work);
    work.then(next).catch((error) => extractor.destroy(error));
  });

  await pipeline(fs.createReadStream(archive), zlib.createGunzip(), extractor);
  await Promise.all(writes);
  if (csvEntries !== 1) throw new Error("O TGZ não contém exatamente um CSV");
  if ((await fs.promises.stat(output)).size === 0)
    throw new Error("CSV extraído está vazio");
}

async function readHeader(file: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(file);
    const parser = parse({ bom: true, to_line: 1 });
    parser.once("readable", () => {
      const row = parser.read() as unknown[] | null;
      input.destroy();
      parser.destroy();
      row
        ? resolve(row.map((value) => String(value).trim().toLowerCase()))
        : reject(new Error("CSV vazio"));
    });
    input.once("error", reject);
    parser.once("error", reject);
    input.pipe(parser);
  });
}

function checkHeader(header: string[]): void {
  if (header.some((column) => /password|senha|token|secret|hash/i.test(column)))
    throw new Error("CSV contém campo sensível");
  if (
    header.length !== expectedColumns.length ||
    new Set(header).size !== header.length ||
    expectedColumns.some((column) => !header.includes(column))
  ) {
    throw new Error(
      `Cabeçalho incompatível: ${header}; esperado: ${expectedColumns}`,
    );
  }
}

async function scalar(sql: string): Promise<number> {
  const result = await client!.query(sql);
  return Number(result.rows[0]?.value ?? 0);
}

async function checkDatabase(dryRun: boolean): Promise<void> {
  const identity = await client!.query(
    "SELECT current_database() AS db, inet_server_addr() AS host, version() AS version",
  );
  const columns = await client!.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'",
  );
  const actual = columns.rows.map((row) => row.column_name);
  if (
    ["id", "name", "email", "created_at", "updated_at"].some(
      (name) => !actual.includes(name),
    )
  )
    throw new Error("Tabela users ausente/incompatível");
  const uniqueEmail = await client!.query(
    "SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='users' AND indexdef ILIKE '%UNIQUE%email%'",
  );
  if (uniqueEmail.rowCount === 0)
    throw new Error("users.email precisa de índice UNIQUE");
  log(
    `Banco=${identity.rows[0].db} host=${identity.rows[0].host ?? "local"} PostgreSQL=${identity.rows[0].version} ambiente=${env.NODE_ENV}${dryRun ? " dry-run" : ""}`,
  );
}

async function importCsv(
  file: string,
  header: string[],
  stats: Stats,
): Promise<void> {
  await client!.query(`CREATE TEMP TABLE users_import_raw (
    row_num bigint GENERATED ALWAYS AS IDENTITY,
    csv_id text, name text, email text, phone text
  ) ON COMMIT DROP`);
  log("[5/7] COPY FROM STDIN para staging temporário...");
  const started = Date.now();
  const copyColumns = header
    .map((column) => (column === "id" ? "csv_id" : column))
    .join(",");
  const copy = client!.query(
    copyFrom(
      `COPY users_import_raw (${copyColumns}) FROM STDIN WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')`,
    ),
  );
  await pipeline(fs.createReadStream(file), copy);
  stats.loaded = await scalar("SELECT COUNT(*) AS value FROM users_import_raw");
  log(
    `${number(stats.loaded)} linhas carregadas em ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );

  const valid = `csv_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND length(btrim(name)) BETWEEN 1 AND 255
    AND length(btrim(email)) BETWEEN 3 AND 255
    AND lower(btrim(email)) ~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'`;
  stats.invalid = await scalar(
    `SELECT COUNT(*) AS value FROM users_import_raw WHERE NOT (${valid})`,
  );
  const dedupStarted = Date.now();
  log("Deduplicando por hash sem ordenar o arquivo inteiro...");
  await client!.query(`CREATE TEMP TABLE users_import_first ON COMMIT DROP AS
    SELECT lower(btrim(email)) AS email, min(row_num) AS row_num
    FROM users_import_raw
    WHERE ${valid}
    GROUP BY lower(btrim(email))`);
  await client!.query(`CREATE UNIQUE INDEX users_import_first_row_num_idx ON users_import_first (row_num)`);
  await client!.query(`CREATE TEMP TABLE users_import_unique ON COMMIT DROP AS
    SELECT raw.csv_id::uuid AS id, btrim(raw.name) AS name, first.email
    FROM users_import_first first
    INNER JOIN users_import_raw raw ON raw.row_num = first.row_num`);
  const candidates = await scalar(
    "SELECT COUNT(*) AS value FROM users_import_unique",
  );
  log(`${number(candidates)} usuários únicos em ${((Date.now() - dedupStarted) / 1000).toFixed(1)}s`);
  stats.duplicates = stats.loaded - stats.invalid - candidates;
  stats.existing =
    await scalar(`SELECT COUNT(*) AS value FROM users_import_unique s
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.email = s.email OR u.id = s.id)`);

  log("[6/7] Inserindo novos usuários...");
  const inserted = await client!
    .query(`INSERT INTO users (id,name,email,created_at,updated_at)
    SELECT id,name,email,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM users_import_unique
    ON CONFLICT DO NOTHING RETURNING id`);
  stats.inserted = inserted.rowCount ?? 0;
  stats.ignored = candidates - stats.inserted;
}

async function cleanup(): Promise<void> {
  if (monitor) clearInterval(monitor);
  monitor = undefined;
  try {
    await client?.query("ROLLBACK");
  } catch {
    // A conexão pode já estar encerrada durante a limpeza.
  }
  try {
    await client?.end();
  } catch {
    // O encerramento é best effort e não deve ocultar o erro original.
  }
  client = undefined;
  if (tempDir) await fs.promises.rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
}

async function main(): Promise<void> {
  const started = Date.now();
  const options = readOptions();
  if (
    env.NODE_ENV === "production" &&
    !options.allowProduction &&
    process.env.ALLOW_PRODUCTION_IMPORT !== "true"
  ) {
    throw new Error("Produção bloqueada; use --allow-production");
  }
  monitor = setInterval(() => {
    const memory = process.memoryUsage();
    log(
      `memory RSS=${Math.round(memory.rss / MB)}MB heap=${Math.round(memory.heapUsed / MB)}/${Math.round(memory.heapTotal / MB)}MB`,
    );
  }, 30000);
  monitor.unref();

  log("[1/7] Validando ambiente...");
  const archive = findArchive();
  log(
    `[2/7] ${archive} (${((await fs.promises.stat(archive)).size / MB).toFixed(1)}MB)`,
  );
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "users-import-"));
  const csv = path.join(tempDir, "users.csv");
  log("[3/7] Extraindo TGZ uma única vez...");
  await extractCsv(archive, csv, options.limit);
  log(
    `CSV extraído: ${((await fs.promises.stat(csv)).size / MB).toFixed(1)}MB`,
  );
  log("[4/7] Validando cabeçalho...");
  const header = await readHeader(csv);
  checkHeader(header);

  client = new Client({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  await checkDatabase(options.dryRun);
  const stats: Stats = {
    loaded: 0,
    invalid: 0,
    duplicates: 0,
    existing: 0,
    inserted: 0,
    ignored: 0,
  };
  if (options.dryRun) log("[5-6/7] Dry-run: nenhuma tabela alterada.");
  else {
    await client.query("BEGIN");
    await client.query("SET LOCAL synchronous_commit = off");
    await client.query("SET LOCAL work_mem = '256MB'");
    await client.query("SET LOCAL temp_buffers = '128MB'");
    await importCsv(csv, header, stats);
    await client.query("COMMIT");
  }

  log("[7/7] Validando resultado...");
  const total = await scalar("SELECT COUNT(*) AS value FROM users");
  const invalidUsers = await scalar(
    "SELECT COUNT(*) AS value FROM users WHERE name IS NULL OR email IS NULL OR btrim(email) = ''",
  );
  if (invalidUsers) throw new Error(`${invalidUsers} usuários inválidos`);
  const seconds = Math.max((Date.now() - started) / 1000, 0.001);
  const memory = process.memoryUsage();
  log(
    `carregadas=${number(stats.loaded)} inválidas=${number(stats.invalid)} duplicadas_csv=${number(stats.duplicates)} existentes=${number(stats.existing)} inseridas=${number(stats.inserted)} ignoradas=${number(stats.ignored)} total=${number(total)} velocidade=${number(Math.round(stats.loaded / seconds))}/s RSS=${Math.round(memory.rss / MB)}MB tempo=${seconds.toFixed(1)}s`,
  );
  if (!options.dryRun && seconds > 300)
    log("AVISO: a importação excedeu a meta de 5 minutos neste ambiente.");
}

let stopping = false;
async function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  log(`${signal}: limpeza controlada`);
  await cleanup();
  process.exitCode = 130;
}
process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      const detail = error as { code?: string; message?: string };
      console.error(
        `ERRO${detail.code ? ` [${detail.code}]` : ""}: ${detail.message ?? error}`,
      );
      process.exitCode = 1;
    })
    .finally(cleanup);
}

export { main as importUsersScript, checkHeader };
