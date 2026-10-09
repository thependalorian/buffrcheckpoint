-- DOC-1: every column carries a comment with its data class. The class comes from the column name: personal data, secrets and key
-- material are Restricted, everything else Internal. Money columns also state their unit. A column that already has a comment is kept.
-- Idempotent.

DO $$
DECLARE
  r record;
  class text;
  note text;
BEGIN
  FOR r IN SELECT c.table_name AS t, c.column_name AS col, c.data_type AS dt
           FROM information_schema.columns c
           JOIN pg_class k ON k.relname = c.table_name
           JOIN pg_namespace n ON n.oid = k.relnamespace AND n.nspname = 'public'
           WHERE c.table_schema = 'public' AND k.relkind = 'r' AND col_description(k.oid, c.ordinal_position::int) IS NULL LOOP
    class := CASE
      WHEN r.col ~ '(email|phone|mobile|_protected$|encrypted|envelope|token_hash|password|secret|subject_reference|recipient|address|comment|signatory|contact_name|photo|ip_address|user_agent|tin$|members)' THEN 'Restricted'
      ELSE 'Internal'
    END;
    note := CASE
      WHEN r.col ~ '(amount|price|total)' AND r.dt = 'numeric' THEN ' Money in major units, paired with a currency code.'
      WHEN r.col ~ '_at$' THEN ' UTC timestamp.'
      WHEN r.col = 'id' OR r.col ~ '_id$' THEN ' Identifier.'
      ELSE ''
    END;
    EXECUTE format('COMMENT ON COLUMN %I.%I IS %L', r.t, r.col,
      class || '. ' || initcap(replace(r.col, '_', ' ')) || ' of ' || replace(r.t, '_', ' ') || '.' || note);
  END LOOP;
END
$$;
