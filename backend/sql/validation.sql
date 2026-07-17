-- Validacao posterior e consultas operacionais. Execute com psql.
SELECT count(*) AS total_users FROM public.users;

SELECT email, count(*)
FROM public.users
GROUP BY email
HAVING count(*) > 1;

SELECT lower(email) AS normalized_email, count(*)
FROM public.users
GROUP BY lower(email)
HAVING count(*) > 1;

SELECT id, name, email, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

SELECT relname,
       pg_size_pretty(pg_relation_size(relid)) AS table_size,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE schemaname = 'public'
  AND relname IN ('users', 'users_import_stage', 'users_import_normalized', 'users_import_ready');
