# Importacao massiva com PostgreSQL 16

Este fluxo importa aproximadamente 10 milhoes de usuarios sem usar Node.js,
Prisma ou outro runtime para ler, transformar ou inserir o CSV. O Prisma continua
responsavel pelas migrations e pelo acesso normal da aplicacao.

## Contrato do arquivo e arquitetura

O arquivo fixo e `backend/data/users.csv.tgz`, montado somente para leitura como
`/data/users.csv.tgz` no servidor PostgreSQL. O TGZ deve conter exatamente um
arquivo CSV UTF-8. O formato preferido e `name,email`; o formato legado
`id,name,email,phone` tambem e aceito, mas `id` e `phone` sao descartados e o UUID
continua sendo criado pelo PostgreSQL.

```csv
name,email
Joao da Silva,joao@email.com
"Maria, Souza",maria@email.com
```

O caminho de dados e:

```text
TGZ -> GNU tar/saida padrao -> COPY FROM PROGRAM -> users_import_stage
    -> users_import_normalized -> users_import_ready
    -> INSERT INTO users SELECT ... ON CONFLICT DO NOTHING
```

`docker/postgres/stream-users-tgz.sh` e chamado por um comando constante do
PostgreSQL. Ele apenas valida o arquivo fixo e transmite o unico CSV; nao analisa
nem transforma registros. Rejeita TGZ invalido, zero ou multiplos CSVs, caminho
absoluto, `../`, barra invertida e cabecalho diferente. Como nenhum nome vindo do
arquivo e concatenado em um comando shell, nao existe interpolacao vulneravel.
Para evitar passagens repetidas por 10 milhoes de linhas, a validacao grava somente
o nome seguro do membro CSV em `/tmp`; `/data` permanece somente leitura. O hash
nao repete a validacao estrutural e o `COPY` descompacta apenas o membro ja validado.

A imagem `docker/postgres/Dockerfile` deriva de `postgres:16-alpine` e instala GNU
tar e coreutils. `COPY FROM PROGRAM` roda no servidor sob o usuario do PostgreSQL;
por isso o programa e o arquivo precisam existir e ser legiveis nesse container.
O usuario do banco que executa o script precisa ser superuser ou possuir
`pg_execute_server_program`. O usuario criado pela imagem oficial e superuser.

## Compatibilidade com o schema Prisma

O modelo `User` mapeia para `public.users`. As colunas reais sao `id uuid`,
`name varchar(255)`, `email varchar(255)`, `password_hash varchar(255) NULL`,
`created_at timestamp(3)` e `updated_at timestamp(3)`. `email` tem o indice unico
`users_email_key`; `id` e a chave primaria. O importador grava email normalizado
em minusculas, preserva o indice Prisma e deixa `password_hash` nulo.

No PostgreSQL 16, `gen_random_uuid()` esta disponivel no core. O script nao cria
UUID na staging: ele chama a funcao apenas no `INSERT` final e depois de excluir
emails existentes. Nao e necessario instalar `pgcrypto` nesse ambiente.

## Staging, normalizacao e transacoes

As tres tabelas intermediarias sao `UNLOGGED`. Isso reduz WAL e costuma acelerar
a carga, mas elas podem ser esvaziadas apos crash, nao sao replicadas como tabelas
normais e jamais devem guardar dados insubstituiveis. Elas sao adequadas aqui
porque podem ser recriadas do TGZ. A staging bruta nao recebe chave primaria nem
indice; `import_order` e uma identity sem indice, usada para manter a primeira
ocorrencia. Somente a tabela deduplicada recebe indice temporario de email.

A estrategia materializada foi escolhida em vez de repetir CTEs: trim, replace,
lower, validacao e a ordenacao de deduplicacao sao feitos uma vez. Isso consome
mais disco temporario, mas evita recalcular essas operacoes sobre 10 milhoes de
linhas. `DISTINCT ON (clean_email) ORDER BY clean_email, import_order` conserva a
primeira ocorrencia valida.

O processo tem fronteiras deliberadas:

1. staging e criada fora da transacao longa;
2. `COPY` termina e fica mensuravel/recuperavel;
3. normalizacao, deduplicacao, anti-join e insercao final ocorrem em uma transacao;
4. tabelas intermediarias sao removidas e `ANALYZE users` roda depois do commit.

Uma falha na etapa 3 reverte toda alteracao da tabela definitiva. A staging bruta
pode permanecer para diagnostico; a proxima execucao a recria. Um advisory lock
impede dois imports simultaneos. `synchronous_commit=off` e apenas local a essa
transacao: pode perder a transacao recem-confirmada num crash do SO, sem corromper
o cluster; remova esse ajuste se essa janela nao for aceitavel.

## Execucao

```bash
cp .env.example .env
docker compose up -d postgres
docker compose run --rm database-init
docker compose up -d backend frontend
```

O fluxo normal completo tambem funciona com:

```bash
docker compose up --build
```

Modo append e o padrao e nunca apaga usuarios:

```bash
docker compose run --rm -e IMPORT_MODE=append database-init
```

O SHA-256 de uma carga completa bem-sucedida e salvo em
`users_import_history`; o mesmo arquivo e ignorado em execucoes posteriores.
Para reprocessar deliberadamente, mantendo `ON CONFLICT`:

```bash
docker compose run --rm -e IMPORT_FORCE=true database-init
```

`recreate` e um modo protegido para benchmark/primeira carga. Ele exige autorizacao
explicita e recusa executar se `users` nao estiver vazia. Ele nao trunca tabela,
nao remove indices e nao apaga dados:

```bash
docker compose run --rm \
  -e IMPORT_MODE=recreate \
  -e ALLOW_PRODUCTION_IMPORT=true \
  database-init
```

Preservar a constraint unica durante `recreate` custa tempo, mas evita uma janela
sem a garantia esperada pelo Prisma e permite rollback simples. Em uma base nova
dedicada a benchmark, criar o indice depois pode ser mais rapido, mas essa opcao
nao foi automatizada por ser destrutiva e arriscada em producao.

Execucao manual dentro do PostgreSQL:

```bash
docker compose exec postgres psql -U weather_app -d weather_users \
  -v import_mode=append -v import_limit=0 -v import_force=false \
  -v allow_production=false -f /sql/import-users.sql
```

## Amostras de teste

`IMPORT_LIMIT` limita candidatos depois que o arquivo inteiro foi carregado e
deduplicado. Assim, testa o SQL final com uma quantidade exata sem usar `head` no
fluxo principal. Como o `COPY` continua completo, para medir descompactacao de uma
amostra crie externamente um TGZ reduzido com o mesmo formato e substitua o arquivo
de teste. Cargas limitadas nao entram no historico SHA-256.

```bash
docker compose run --rm -e IMPORT_LIMIT=10000 database-init
docker compose run --rm -e IMPORT_LIMIT=100000 database-init
docker compose run --rm -e IMPORT_LIMIT=1000000 database-init
docker compose run --rm -e IMPORT_LIMIT=0 database-init   # arquivo completo
```

## Estatisticas e monitoramento

O script ativa `ON_ERROR_STOP` e `timing`, e imprime carregadas, nomes/emails
invalidos, duplicadas, existentes, inseridas, ignoradas, total final e duracao de
COPY, normalizacao, deduplicacao, insercao e total. As contagens reutilizam as
tabelas materializadas; nao ha `COUNT(*)` continuo durante a carga.

Em outro terminal:

```bash
docker compose exec postgres psql -U weather_app -d weather_users \
  -f /sql/monitor-import.sql
```

O arquivo mostra `pg_stat_progress_copy`, atividade/waits, arquivos temporarios,
progresso de indice e tamanhos com estimativa de linhas. Em `COPY FROM PROGRAM`,
`bytes_total` pode ser zero porque o servidor nao conhece previamente o tamanho
descompactado. Para validacao posterior:

```bash
docker compose exec postgres psql -U weather_app -d weather_users \
  -f /sql/validation.sql
```

### Benchmark da passagem unica

No mesmo Windows/Docker Desktop, o benchmark inicial levou 5 min 35 s no host e
2 min 8 s na fase COPY/validacao. Depois de eliminar as passagens redundantes do
TGZ, um reprocessamento idempotente levou 1 min 51,5 s no host e 45,5 s na fase
COPY/validacao. A segunda medicao utilizou cache de disco aquecido e banco ja
populado; portanto demonstra o ganho da leitura, mas nao garante o tempo de uma
carga fria em outra maquina.

Evite repetir `COUNT(*)` durante a carga. Para benchmark, salve o log de `psql` e
compare as linhas `Time:` e o resumo final. O tempo de descompactacao esta incluido
no COPY; meca isoladamente apenas para diagnostico com
`docker compose exec postgres time /usr/local/bin/climausers-users-archive >/dev/null`.

## Memoria e armazenamento

O script nao fixa `work_mem`: esse valor pode ser consumido varias vezes e por
varios workers na mesma consulta. Ponto de partida, sempre apos observar o host:

| RAM do host | shared_buffers | work_mem por operacao | maintenance_work_mem |
|---|---:|---:|---:|
| 8 GB | 1-2 GB | 32-64 MB | 256-512 MB |
| 16 GB | 3-4 GB | 64-128 MB | 512 MB-1 GB |
| 32 GB | 6-8 GB | 128-256 MB | 1-2 GB |

Docker Desktop precisa deixar memoria para Windows/WSL. Valores sao ponto de
partida, nao defaults universais. Monitore spill em `pg_stat_database.temp_bytes`.
SSD, espaco para staging/ready e temporarios, `max_wal_size` suficiente para evitar
checkpoints frequentes e `wal_compression=on` tendem a trazer ganhos reais.
`fsync` e `full_page_writes` permanecem ligados. Desliga-los pode corromper/perder
o banco em uma falha e so seria aceitavel em benchmark descartavel, seguido de
recriacao integral do cluster e restauracao das configuracoes; nunca em producao.

## Estimativas realistas para 10 milhoes

Faixas orientativas, assumindo linhas curtas, um unico indice unico e disco com
espaco. Dados mais largos, muitos duplicados, WAL/checkpoints e concorrencia mudam
substancialmente os numeros.

| Ambiente | COPY | normalizar/deduplicar | inserir/UUID | indice/ANALYZE | total |
|---|---:|---:|---:|---:|---:|
| Windows Docker, 8 GB | 2-8 min | 5-20 min | 5-20 min | 2-10 min | 14-58 min |
| Windows Docker, 16 GB | 1-5 min | 3-12 min | 3-12 min | 1-7 min | 8-36 min |
| Linux, SSD SATA | 1-4 min | 2-10 min | 2-10 min | 1-5 min | 6-29 min |
| Linux, SSD NVMe | 0,5-3 min | 1-7 min | 1-7 min | 0,5-4 min | 3-21 min |
| Linux, 32 GB + NVMe | 0,5-2 min | 1-5 min | 1-5 min | 0,5-3 min | 3-15 min |

O indice ja existe e e mantido nesta implementacao; a coluna "indice/ANALYZE"
representa manutencao do indice durante INSERT mais ANALYZE, nao uma fase separada
obrigatoria. Nao ha garantia de segundos. Tamanho do CSV, compressao, CPU do tar,
largura das linhas, RAM, spill, disco, Docker, WAL, duplicados, indices e carga
concorrente sao os fatores dominantes.

## Erros comuns

- TGZ inexistente/permissao: confira o bind mount e `ls -l /data` no postgres.
- `tar` ausente: reconstrua com `docker compose build --no-cache postgres`.
- TGZ invalido/multiplos CSVs/path perigoso: recrie o pacote com um unico CSV.
- cabecalho: use `name,email` ou `id,name,email,phone` (CRLF e aceito).
- CSV malformado/aspas abertas: o proprio parser CSV do COPY encerra com linha/erro.
- UTF-8 invalido: converta a fonte antes de empacotar; nao force perda de caracteres.
- campo longo: staging aceita TEXT; valores acima de 255 sao contabilizados e ignorados.
- sem espaco: libere espaco no volume Docker e no armazenamento temporario.
- sem memoria: reduza configuracoes por sessao/servidor e permita spill em disco.
- conflito de email: append normaliza, faz anti-join case-insensitive e ainda usa
  `ON CONFLICT (email) DO NOTHING` contra corrida concorrente.
- schema diferente: a validacao falha antes do COPY; compare com `schema.prisma`.
- timestamp/UUID: o INSERT fornece ambos timestamps e UUID no PostgreSQL.
- extensao: PostgreSQL 16 fornece `gen_random_uuid()` sem `CREATE EXTENSION`.
- volume no Windows: use o volume nomeado `postgres_data`, nunca bind mount de PGDATA.
- importacao duplicada: consulte `users_import_history`; use `IMPORT_FORCE` somente
  quando realmente quiser reprocessar.
- migration em volume legado criado por `prisma db push`: faça backup e marque a
  migration inicial como aplicada com `npx prisma migrate resolve --applied
  20260717000100_initial` uma unica vez antes de `migrate deploy`.

## Paginacao com 10 milhoes

O repository atual usa `skip/take`, portanto gera OFFSET e tambem executa COUNT.
Paginas profundas, como `OFFSET 9000000`, ficam progressivamente caras. A carga nao
altera a API para preservar compatibilidade, mas a evolucao recomendada e cursor
estavel composto por `(created_at, id)` (ou email/id para ordenacao por email), com
indice correspondente e retorno de `nextCursor`. Totais exatos podem ser opcionais
ou calculados fora da requisicao interativa.

## Decisoes tecnicas

- PostgreSQL 16 foi mantido porque ja e o banco do Prisma e oferece COPY, UUID,
  staging e deduplicacao set-based no mesmo motor.
- `COPY FROM PROGRAM` transmite TGZ -> tar -> PostgreSQL sem CSV permanente.
- Prisma/Node nao participam porque parser, objetos e round-trips adicionariam CPU,
  memoria e gargalo; Prisma permanece nas migrations e operacoes normais.
- Nao ha loop nem milhoes de INSERTs: `INSERT INTO ... SELECT` permite ao planner
  trabalhar em conjunto e reduz round-trips/WAL por comando.
- staging `UNLOGGED` reduz WAL para dados reconstruiveis; nunca e a tabela final.
- SQL normaliza e deduplica uma vez; um DELETE gigante geraria mais escrita, WAL e
  bloat que selecionar somente os vencedores.
- UUID e gerado somente na insercao para nao gastar CPU com invalidos, duplicados
  ou existentes. Um arquivo SQL com UUID/INSERTs seria enorme e lento de analisar.
- O indice unico de email garante integridade e acelera conflito, mas cada insercao
  precisa atualiza-lo. Remove-lo automaticamente seria perigoso para a aplicacao.
- Segundos nao podem ser prometidos: descompressao, ordenacao, WAL e I/O dominam.
- Os maiores ganhos reais sao COPY em fluxo, staging UNLOGGED, uma unica
  normalizacao/deduplicacao materializada, SSD, RAM suficiente para reduzir spill,
  checkpoints bem dimensionados e ausencia de indices redundantes.
