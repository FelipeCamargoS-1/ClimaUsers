-- COPY em andamento (bytes_total pode ser zero em COPY FROM PROGRAM).
SELECT pid, datname, relid::regclass AS table_name, command, type,
       bytes_processed, bytes_total, tuples_processed
FROM pg_stat_progress_copy;

-- Atividade, temporarios acumulados e progresso de indices.
SELECT pid, state, wait_event_type, wait_event,
       clock_timestamp() - query_start AS elapsed, left(query, 120) AS query
FROM pg_stat_activity
WHERE datname = current_database() AND state <> 'idle';

SELECT datname, temp_files, pg_size_pretty(temp_bytes) AS temp_size
FROM pg_stat_database
WHERE datname = current_database();

SELECT pid, relid::regclass AS table_name, index_relid::regclass AS index_name,
       phase, blocks_done, blocks_total, tuples_done, tuples_total
FROM pg_stat_progress_create_index;

SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE relname LIKE 'users%';
