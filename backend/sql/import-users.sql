\set ON_ERROR_STOP on
\timing on

-- Parametros seguros. Ex.: -v import_mode=append -v import_limit=0 -v import_force=false
\if :{?import_mode}
\else
  \set import_mode append
\endif
\if :{?allow_production}
\else
  \set allow_production false
\endif
\if :{?import_limit}
\else
  \set import_limit 0
\endif
\if :{?import_force}
\else
  \set import_force false
\endif

SELECT :'import_mode' IN ('append', 'recreate') AS valid_mode,
       :'allow_production' IN ('true', 'false') AS valid_allow,
       :'import_force' IN ('true', 'false') AS valid_force,
       :'import_limit' ~ '^[0-9]+$' AS valid_limit
\gset
\if :valid_mode
\else
  \echo 'ERRO: import_mode deve ser append ou recreate.'
  \quit 2
\endif
\if :valid_allow
\else
  \echo 'ERRO: allow_production deve ser true ou false.'
  \quit 2
\endif
\if :valid_force
\else
  \echo 'ERRO: import_force deve ser true ou false.'
  \quit 2
\endif
\if :valid_limit
\else
  \echo 'ERRO: import_limit deve ser um inteiro maior ou igual a zero.'
  \quit 2
\endif

SELECT CASE
         WHEN :'import_mode' = 'recreate' AND :'allow_production' <> 'true' THEN false
         ELSE true
       END AS mode_authorized
\gset
\if :mode_authorized
\else
  \echo 'ERRO: recreate exige -v allow_production=true. Esse modo somente aceita public.users vazia.'
  \quit 3
\endif

SELECT pg_advisory_lock(hashtextextended('climausers.users_import', 0));

DO $validation$
DECLARE
  missing text[];
BEGIN
  IF current_setting('server_version_num')::integer < 160000 THEN
    RAISE EXCEPTION 'PostgreSQL 16 ou superior e obrigatorio';
  END IF;
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Tabela Prisma public.users nao encontrada';
  END IF;
  SELECT array_agg(required.name)
    INTO missing
    FROM (VALUES ('id'), ('name'), ('email'), ('created_at'), ('updated_at')) required(name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = 'users'
        AND c.column_name = required.name
   );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Schema public.users incompativel; colunas ausentes: %', missing;
  END IF;
END
$validation$;

CREATE TABLE IF NOT EXISTS public.users_import_history (
  archive_sha256 text PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  import_mode text NOT NULL CHECK (import_mode IN ('append', 'recreate')),
  loaded bigint NOT NULL,
  inserted bigint NOT NULL
);

CREATE TEMP TABLE users_archive_identity (archive_sha256 text NOT NULL);
COPY users_archive_identity (archive_sha256)
FROM PROGRAM '/usr/local/bin/climausers-users-archive --fingerprint'
WITH (FORMAT text);

SELECT archive_sha256 FROM users_archive_identity \gset archive_
SELECT EXISTS (
  SELECT 1 FROM public.users_import_history
   WHERE archive_sha256 = :'archive_archive_sha256'
) AND :'import_force' <> 'true' AS skip_import
\gset

\if :skip_import
  \echo 'Arquivo ja importado com sucesso. Use -v import_force=true para reprocessar com ON CONFLICT.'
\else
  SELECT CASE WHEN :'import_mode' = 'recreate' AND EXISTS (SELECT 1 FROM public.users LIMIT 1)
              THEN false ELSE true END AS recreate_is_empty
  \gset
  \if :recreate_is_empty
  \else
    \echo 'ERRO: recreate e permitido somente quando public.users esta vazia; nenhum dado foi removido.'
    \quit 4
  \endif

  DROP TABLE IF EXISTS public.users_import_ready;
  DROP TABLE IF EXISTS public.users_import_normalized;
  DROP TABLE IF EXISTS public.users_import_stage;

  CREATE UNLOGGED TABLE public.users_import_stage (
    import_order bigint GENERATED ALWAYS AS IDENTITY,
    csv_id text,
    name text,
    email text,
    phone text
  );

  CREATE TEMP TABLE users_import_stats (
    started_at timestamptz NOT NULL,
    copy_started_at timestamptz,
    copy_finished_at timestamptz,
    normalize_started_at timestamptz,
    normalize_finished_at timestamptz,
    dedup_started_at timestamptz,
    dedup_finished_at timestamptz,
    insert_started_at timestamptz,
    insert_finished_at timestamptz,
    loaded bigint DEFAULT 0,
    invalid_name bigint DEFAULT 0,
    invalid_email bigint DEFAULT 0,
    valid_rows bigint DEFAULT 0,
    duplicates_csv bigint DEFAULT 0,
    existing_users bigint DEFAULT 0,
    candidates bigint DEFAULT 0,
    inserted bigint DEFAULT 0
  );
  INSERT INTO users_import_stats (started_at, copy_started_at)
  VALUES (clock_timestamp(), clock_timestamp());

  \echo 'Carregando TGZ diretamente em staging com COPY FROM PROGRAM...'
  CREATE TEMP TABLE users_archive_format (format text NOT NULL);
  COPY users_archive_format (format)
  FROM PROGRAM '/usr/local/bin/climausers-users-archive --format';
  SELECT format = 'standard2' AS is_standard2 FROM users_archive_format \gset
  \if :is_standard2
    COPY public.users_import_stage (name, email)
    FROM PROGRAM '/usr/local/bin/climausers-users-archive'
    WITH (FORMAT CSV, HEADER true, DELIMITER ',', QUOTE '"', ESCAPE '"', NULL '', ENCODING 'UTF8');
  \else
    COPY public.users_import_stage (csv_id, name, email, phone)
    FROM PROGRAM '/usr/local/bin/climausers-users-archive'
    WITH (FORMAT CSV, HEADER true, DELIMITER ',', QUOTE '"', ESCAPE '"', NULL '', ENCODING 'UTF8');
  \endif
  UPDATE users_import_stats
     SET copy_finished_at = clock_timestamp(),
         loaded = (SELECT count(*) FROM public.users_import_stage);

  BEGIN;
  SET LOCAL synchronous_commit = off;
  UPDATE users_import_stats SET normalize_started_at = clock_timestamp();

  CREATE UNLOGGED TABLE public.users_import_normalized AS
  SELECT import_order,
         NULLIF(btrim(replace(name, chr(13), '')), '') AS clean_name,
         NULLIF(lower(btrim(replace(email, chr(13), ''))), '') AS clean_email
    FROM public.users_import_stage;

  UPDATE users_import_stats s
     SET normalize_finished_at = clock_timestamp(),
         invalid_name = q.invalid_name,
         invalid_email = q.invalid_email,
         valid_rows = q.valid_rows
    FROM (
      SELECT count(*) FILTER (
               WHERE clean_name IS NULL OR length(clean_name) > 255
             ) AS invalid_name,
             count(*) FILTER (
               WHERE clean_email IS NULL OR length(clean_email) > 255
                  OR clean_email LIKE '% %'
                  OR clean_email NOT LIKE '%_@_%'
                  OR strpos(clean_email, '@') <= 1
                  OR strpos(substr(clean_email, strpos(clean_email, '@') + 1), '@') > 0
             ) AS invalid_email,
             count(*) FILTER (
               WHERE clean_name IS NOT NULL AND length(clean_name) <= 255
                 AND clean_email IS NOT NULL AND length(clean_email) <= 255
                 AND clean_email NOT LIKE '% %'
                 AND clean_email LIKE '%_@_%'
                 AND strpos(clean_email, '@') > 1
                 AND strpos(substr(clean_email, strpos(clean_email, '@') + 1), '@') = 0
             ) AS valid_rows
        FROM public.users_import_normalized
    ) q;

  UPDATE users_import_stats SET dedup_started_at = clock_timestamp();
  CREATE UNLOGGED TABLE public.users_import_ready AS
  SELECT deduplicated.*,
         row_number() OVER (ORDER BY import_order) AS selection_order
    FROM (
      SELECT DISTINCT ON (clean_email) import_order, clean_name, clean_email
        FROM public.users_import_normalized
       WHERE clean_name IS NOT NULL AND length(clean_name) <= 255
         AND clean_email IS NOT NULL AND length(clean_email) <= 255
         AND clean_email NOT LIKE '% %'
         AND clean_email LIKE '%_@_%'
         AND strpos(clean_email, '@') > 1
         AND strpos(substr(clean_email, strpos(clean_email, '@') + 1), '@') = 0
       ORDER BY clean_email, import_order
    ) deduplicated;

  CREATE UNIQUE INDEX users_import_ready_email_idx
      ON public.users_import_ready (clean_email);
  ANALYZE public.users_import_ready;

  UPDATE users_import_stats s
     SET dedup_finished_at = clock_timestamp(),
         candidates = q.candidates,
         duplicates_csv = s.valid_rows - q.all_unique
    FROM (
      SELECT count(*) FILTER (
               WHERE :import_limit::bigint = 0 OR selection_order <= :import_limit::bigint
             ) AS candidates,
             count(*) AS all_unique
        FROM public.users_import_ready
    ) q;

  UPDATE users_import_stats s
     SET existing_users = q.existing_users
    FROM (
      SELECT count(*) AS existing_users
        FROM public.users_import_ready r
        JOIN public.users u ON lower(btrim(u.email)) = r.clean_email
       WHERE :import_limit::bigint = 0 OR r.selection_order <= :import_limit::bigint
    ) q;

  UPDATE users_import_stats SET insert_started_at = clock_timestamp();
  WITH inserted AS (
    INSERT INTO public.users (id, name, email, created_at, updated_at)
    SELECT gen_random_uuid(), clean_name, clean_email, now(), now()
      FROM public.users_import_ready r
     WHERE (:import_limit::bigint = 0 OR r.selection_order <= :import_limit::bigint)
       AND NOT EXISTS (
         SELECT 1 FROM public.users u WHERE lower(btrim(u.email)) = r.clean_email
       )
    ON CONFLICT (email) DO NOTHING
    RETURNING 1
  )
  UPDATE users_import_stats SET inserted = (SELECT count(*) FROM inserted);
  UPDATE users_import_stats SET insert_finished_at = clock_timestamp();

  INSERT INTO public.users_import_history
    (archive_sha256, import_mode, loaded, inserted)
  SELECT :'archive_archive_sha256', :'import_mode', loaded, inserted
    FROM users_import_stats
   WHERE :import_limit::bigint = 0
  ON CONFLICT (archive_sha256) DO UPDATE
    SET imported_at = clock_timestamp(),
        import_mode = EXCLUDED.import_mode,
        loaded = EXCLUDED.loaded,
        inserted = EXCLUDED.inserted;
  COMMIT;

  \echo 'Estatisticas da importacao:'
  SELECT loaded AS "Linhas carregadas na staging",
         invalid_name AS "Linhas com nome invalido",
         invalid_email AS "Linhas com email invalido",
         duplicates_csv AS "Linhas duplicadas no CSV",
         existing_users AS "Usuarios ja existentes",
         inserted AS "Usuarios inseridos",
         (candidates - inserted) AS "Usuarios ignorados",
         (SELECT count(*) FROM public.users) AS "Total final da tabela",
         copy_finished_at - copy_started_at AS "Tempo do COPY",
         normalize_finished_at - normalize_started_at AS "Tempo da normalizacao",
         dedup_finished_at - dedup_started_at AS "Tempo da deduplicacao",
         insert_finished_at - insert_started_at AS "Tempo da insercao",
         clock_timestamp() - started_at AS "Tempo total"
    FROM users_import_stats;

  SELECT pg_size_pretty(pg_total_relation_size('public.users_import_stage')) AS staging,
         pg_size_pretty(pg_total_relation_size('public.users')) AS users;

  DROP TABLE public.users_import_ready;
  DROP TABLE public.users_import_normalized;
  DROP TABLE public.users_import_stage;
  ANALYZE public.users;
\endif

SELECT pg_advisory_unlock(hashtextextended('climausers.users_import', 0));
