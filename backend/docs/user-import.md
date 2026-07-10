# Importação massiva de usuários no PostgreSQL

O importador lê `data/users.csv.tgz`, extrai seu único CSV em uma passagem, valida o cabeçalho `id,name,email,phone` e usa `COPY FROM STDIN` para carregar uma tabela temporária do PostgreSQL. O campo `phone` é aceito no arquivo, mas não é persistido porque não existe em `users`.

## Desempenho

A carga foi desenhada para concluir em até cinco minutos no ambiente de destino: descompactação única, `COPY` binário no protocolo, staging temporário, `synchronous_commit=off` apenas na transação de importação e deduplicação feita pelo PostgreSQL. O resumo informa o tempo total e avisa quando a execução ultrapassa 300 segundos. O resultado real depende de CPU, disco, volume do CSV e distância até o servidor; valide a meta no hardware de produção.

## Execução

Na pasta `backend`:

```bash
npm run seed:users -- --limit=10000 --dry-run
npm run seed:users -- --limit=10000
npm run seed:users
npm run seed:users -- --allow-production
```

O `--dry-run` verifica arquivo, cabeçalho, conexão, tabela e índice, sem alterar dados. `--limit=N` usa uma amostra. Em produção, a execução exige `--allow-production` ou `ALLOW_PRODUCTION_IMPORT=true`.

## Segurança e idempotência

IDs precisam ser UUIDs válidos, nomes têm até 255 caracteres e e-mails são normalizados para minúsculas. Duplicatas do CSV são removidas e `ON CONFLICT DO NOTHING` preserva usuários existentes. A tabela definitiva nunca é truncada. Staging e arquivos extraídos são temporários e removidos após sucesso, erro ou interrupção.

Antes da carga completa, aplique o schema:

```bash
npx prisma generate
npx prisma db push
```

Para acompanhar o PostgreSQL durante a carga:

```sql
SELECT pid, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE datname = current_database();
SELECT COUNT(*) FROM users;
```
