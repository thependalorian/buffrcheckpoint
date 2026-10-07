-- One-off maintenance (2026-10-06): remove abusive sign-ups. Thirteen organisations named like "Aictjdsgb LLC" were registered in
-- 24 hours with other people's business email addresses (a law firm, an insurer, a pharma company). None logged in, none created a
-- site, and the two that show a verified email were verified by a mail scanner following the link. They are not customers.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v dry_run=1 -f 0002_remove_abusive_signups.sql
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v dry_run=0 -f 0002_remove_abusive_signups.sql
--
-- Selection is deliberately narrow: a single-word random name ending in LLC, one user who never signed in, no sites, no visits,
-- still at the first onboarding step, registered in the last 14 days. Anything else is left alone.

\if :{?dry_run}
\else
  \set dry_run 1
\endif

BEGIN;

CREATE TEMP TABLE purge_orgs AS
SELECT o.id, o.legal_name FROM organisations o
WHERE o.deleted_at IS NULL
  AND o.legal_name ~ '^[A-Z][a-z]{3,14} LLC$'
  AND (SELECT count(*) FROM application_users u WHERE u.organisation_id = o.id) = 1
  AND NOT EXISTS (SELECT 1 FROM application_users u WHERE u.organisation_id = o.id AND u.last_login_at IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM sites s WHERE s.organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM visitor_visits v WHERE v.organisation_id = o.id)
  AND EXISTS (SELECT 1 FROM organisation_onboarding_states s JOIN type_definition c ON c.id = s.current_step_code
              WHERE s.organisation_id = o.id AND c.code = 'organisation_profile'
                AND jsonb_array_length(s.completed_step_codes) = 0)
  AND (SELECT min(occurred_at) FROM audit_events a WHERE a.organisation_id = o.id) > now() - interval '14 days';

CREATE TEMP TABLE purge_log (tbl text, rows_removed bigint);

CREATE FUNCTION pg_temp.purge_rows(parent regclass, cond text) RETURNS void AS $$
DECLARE
  fk record;
  n bigint;
BEGIN
  FOR fk IN
    SELECT c.conrelid::regclass AS child,
           (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
              FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS child_cols,
           (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
              FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS parent_cols
    FROM pg_constraint c
    WHERE c.contype = 'f' AND c.confrelid = parent
  LOOP
    IF fk.child = parent THEN
      EXECUTE format('UPDATE %s SET %s = NULL WHERE %s', parent, fk.child_cols, cond);
    ELSE
      PERFORM pg_temp.purge_rows(
        fk.child,
        format('(%s) IN (SELECT %s FROM %s WHERE %s)', fk.child_cols, fk.parent_cols, parent, cond));
    END IF;
  END LOOP;
  EXECUTE format('DELETE FROM %s WHERE %s', parent, cond);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN INSERT INTO purge_log VALUES (parent::text, n); END IF;
END
$$ LANGUAGE plpgsql;

\echo '== To remove'
SELECT legal_name FROM purge_orgs ORDER BY 1;

SELECT pg_temp.purge_rows('organisations', 'id IN (SELECT id FROM purge_orgs)');

\echo '== Check: expect 0'
SELECT count(*) AS still_present FROM organisations WHERE id IN (SELECT id FROM purge_orgs);
SELECT count(*) AS real_orgs_kept FROM organisations WHERE deleted_at IS NULL;

\if :dry_run
  \echo 'DRY RUN: rolling back'
  ROLLBACK;
\else
  \echo 'COMMIT'
  COMMIT;
\endif
