-- Static schema guard (blueprint 14.1, standard section 11 and 19.2, DOC-1). Each row is one check and its violation count; every count must be 0.
--   psql -tA -F, -f backend/db/maintenance/schema-guard.sql
SELECT 'float_money', count(*) FROM information_schema.columns WHERE table_schema = 'public' AND data_type IN ('real', 'double precision')
UNION ALL SELECT 'updated_at_on_log_tables', count(*) FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name = 'updated_at' AND (table_name ~ '(_log|_events)$' OR table_name = 'audit_events')
UNION ALL SELECT 'enum_types', count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'
UNION ALL SELECT 'tenant_table_without_leading_index', count(*) FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.column_name = 'organisation_id'
    AND EXISTS (SELECT 1 FROM pg_class k JOIN pg_namespace n ON n.oid = k.relnamespace WHERE k.relname = c.table_name AND n.nspname = 'public' AND k.relkind = 'r')
    AND NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = i.indkey[0]
                    WHERE t.relname = c.table_name AND a.attname = 'organisation_id')
UNION ALL SELECT 'tables_without_comment', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND obj_description(c.oid, 'pg_class') IS NULL
UNION ALL SELECT 'columns_without_comment', count(*) FROM information_schema.columns c
  JOIN pg_class k ON k.relname = c.table_name JOIN pg_namespace n ON n.oid = k.relnamespace AND n.nspname = 'public'
  WHERE c.table_schema = 'public' AND k.relkind = 'r' AND col_description(k.oid, c.ordinal_position::int) IS NULL;
