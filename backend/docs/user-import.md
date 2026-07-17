# Importação massiva de usuários

## Arquivo esperado

Coloque o arquivo fornecido pelo avaliador em:

```text
backend/data/users.csv.tgz
```

O TGZ deve conter exatamente um CSV UTF-8 com as colunas `id,name,email,phone`. A ordem das colunas pode variar. Campos sensíveis como senha, token ou hash são recusados. O campo `phone` é validado como parte do formato, mas não é persistido porque não existe na tabela `users`.

O arquivo é ignorado pelo Git e pelo contexto de build. O Compose monta `backend/data` somente no contêiner `database-init`, em modo de leitura, evitando imagens Docker gigantes.

## Fluxo recomendado para avaliação

Na raiz do repositório:

```bash
cp .env.example .env
# Preencha POSTGRES_PASSWORD, AUTH_PEPPER, CSRF_SECRET e, para clima, WEATHER_API_KEY.
docker compose up --build
```

O Compose aguarda o PostgreSQL ficar saudável, aplica o schema com Prisma, importa o arquivo quando ele existir, inicia o backend e por último o frontend. Sem o TGZ, a aplicação sobe normalmente com o banco vazio.

Acompanhe a importação com:

```bash
docker compose logs -f database-init
```

Para executar novamente o inicializador de forma explícita:

```bash
docker compose run --rm database-init
```

## Teste rápido por amostra

Para validar o arquivo sem processar toda a base:

```bash
docker compose run --rm database-init sh -c "npx prisma db push && npm run seed:users -- --allow-production --limit=1000"
```

O parâmetro `--dry-run` valida arquivo, cabeçalho, conexão, tabela e índice, sem carregar as linhas no staging nem alterar a tabela final:

```bash
docker compose run --rm database-init sh -c "npx prisma db push && npm run seed:users -- --allow-production --dry-run"
```

## Como funciona

1. Confere ambiente e localização do arquivo.
2. Extrai uma única vez o CSV para uma pasta temporária.
3. Valida o cabeçalho e rejeita campos sensíveis.
4. Verifica tabela, colunas e índice único de e-mail.
5. Usa `COPY FROM STDIN` para carregar uma tabela temporária com alto desempenho.
6. Valida UUID, nome e e-mail; normaliza e-mails para minúsculas.
7. Mantém apenas a primeira ocorrência de cada e-mail no CSV.
8. Insere em uma transação e usa `ON CONFLICT DO NOTHING` para preservar registros existentes.
9. Confere o total e remove arquivos/tabelas temporários.

A tabela definitiva nunca é truncada pelo importador. Se ocorrer erro antes do `COMMIT`, a transação é revertida. A execução é idempotente: repetir o mesmo arquivo não duplica IDs ou e-mails.

Usuários importados têm `passwordHash = null`: aparecem na gestão de usuários, mas não conseguem autenticar. Contas com login devem ser criadas pela tela de cadastro.

## Verificação

```bash
docker compose exec postgres psql -U weather_app -d weather_users -c "SELECT COUNT(*) FROM users;"
docker compose exec postgres psql -U weather_app -d weather_users -c "SELECT lower(email), COUNT(*) FROM users GROUP BY lower(email) HAVING COUNT(*) > 1;"
```

No arquivo de 10 milhões de linhas usado durante a revisão, o processo levou aproximadamente 10 minutos no ambiente local. O tempo varia conforme CPU, disco e memória disponíveis ao Docker.
