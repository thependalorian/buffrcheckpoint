-- One-off maintenance (2026-10-06): clear seed and test organisation data from the database. Owner request: production starts empty.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v dry_run=1 -f 0001_clear_seed_organisation_data.sql   # prints what it would remove, changes nothing
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v dry_run=0 -f 0001_clear_seed_organisation_data.sql   # removes it
--
-- Take a Neon branch of the database first; this deletes rows and cannot be undone from SQL.
--
-- Part 1: test organisations. Every organisation that is already soft-deleted AND is named like a test fixture (E2E, Smoke, Test,
--         Journey, Canonical, Demo) is removed together with everything that depends on it. A soft-deleted organisation that does not
--         match (a real customer who left) is never touched.
-- Part 2: demo content in the platform operator organisation (Buffr Financial Services CC, trading as Buffr Analytics): sites, hosts,
--         visits, visitors, forms, kiosks, QR codes, directory and derived analytics. The organisation, its users, roles, onboarding
--         state, subscription, settings and its audit trail stay: the audit chain is per organisation and must stay whole.
--
-- Part 3: the demo sign-ins in the operator organisation (addresses ending @buffrcheckpoint.test: the kiosk demo owner and the
--         platform-ops demo). Their passwords were published in this repository. They are soft-deleted, their password and MFA secret
--         are cleared, and their memberships are ended; rows that point at them (go-live approval, access reviews) stay intact.
--         Tokens already issued expire within 8 hours. The real platform_support account is untouched.
--
-- Rows are found by following foreign keys from the parent table, so nothing is left pointing at a removed row, and no trigger or
-- cascade is involved (D-02). Self-references are cleared before the delete.

\if :{?dry_run}
\else
  \set dry_run 1
\endif

BEGIN;

CREATE TEMP TABLE purge_orgs AS
SELECT id, legal_name FROM organisations
WHERE deleted_at IS NOT NULL AND legal_name ~* '(e2e|smoke|test|journey|canonical|demo)';

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

\echo '== Part 1: test organisations to remove'
SELECT legal_name FROM purge_orgs ORDER BY 1;

SELECT pg_temp.purge_rows('organisations', 'id IN (SELECT id FROM purge_orgs)');

\echo '== Part 2: demo content in the operator organisation'
-- Operator organisation by name, not by a hard-coded id, and only if it exists exactly once.
CREATE TEMP TABLE operator_org AS
SELECT id FROM organisations WHERE legal_name = 'Buffr Financial Services CC' AND deleted_at IS NULL;
DO $$ BEGIN
  IF (SELECT count(*) FROM operator_org) <> 1 THEN RAISE EXCEPTION 'expected exactly one operator organisation'; END IF;
END $$;

SELECT pg_temp.purge_rows(t, 'organisation_id = (SELECT id FROM operator_org)')
FROM (VALUES
  ('sites'::regclass), ('site_hosts'), ('visitor_categories'), ('check_in_form_definitions'), ('kiosk_experience_configurations'),
  ('host_notification_escalation_policies'), ('managed_kiosk_devices'), ('security_zones'), ('site_qr_references'),
  ('organisation_units'), ('visitor_subjects'), ('visit_daily_fact'), ('visit_hourly_fact'), ('emergency_roll_call_events'),
  ('notification_delivery_instructions'), ('organisation_health_snapshot')
) AS demo(t);

\echo '== Part 3: demo sign-ins in the operator organisation'
CREATE TEMP TABLE demo_users AS
SELECT id FROM application_users
WHERE organisation_id = (SELECT id FROM operator_org) AND email ~* '@buffrcheckpoint\.test$' AND deleted_at IS NULL;
SELECT count(*) AS demo_users_found FROM demo_users;
UPDATE organisation_memberships SET deleted_at = now() WHERE user_id IN (SELECT id FROM demo_users) AND deleted_at IS NULL;
UPDATE mfa_recovery_codes SET deleted_at = now() WHERE user_id IN (SELECT id FROM demo_users) AND deleted_at IS NULL;
UPDATE application_users SET deleted_at = now(), password_hash = NULL, mfa_enabled = false, mfa_secret_reference = NULL
WHERE id IN (SELECT id FROM demo_users);

\echo '== Removed (rows per table)'
SELECT tbl, sum(rows_removed) AS rows_removed FROM purge_log GROUP BY tbl ORDER BY rows_removed DESC, tbl;

\echo '== Checks: expect 0'
SELECT count(*) AS organisations_still_present FROM organisations WHERE id IN (SELECT id FROM purge_orgs);
SELECT count(*) AS operator_demo_rows_left FROM (
  SELECT 1 FROM sites WHERE organisation_id = (SELECT id FROM operator_org)
  UNION ALL SELECT 1 FROM visitor_visits WHERE organisation_id = (SELECT id FROM operator_org)
  UNION ALL SELECT 1 FROM visitor_subjects WHERE organisation_id = (SELECT id FROM operator_org)
  UNION ALL SELECT 1 FROM kiosk_experience_configurations WHERE organisation_id = (SELECT id FROM operator_org)
) x;

SELECT count(*) AS demo_users_still_active FROM application_users
WHERE id IN (SELECT id FROM demo_users) AND (deleted_at IS NULL OR password_hash IS NOT NULL);
SELECT count(*) AS real_platform_staff_left_active FROM application_users u
WHERE u.organisation_id = (SELECT id FROM operator_org) AND u.deleted_at IS NULL AND u.password_hash IS NOT NULL;

\echo '== Operator organisation rows kept'
SELECT 'application_users' AS tbl, count(*) FROM application_users WHERE organisation_id = (SELECT id FROM operator_org)
UNION ALL SELECT 'organisation_memberships', count(*) FROM organisation_memberships WHERE organisation_id = (SELECT id FROM operator_org)
UNION ALL SELECT 'role_definitions', count(*) FROM role_definitions WHERE organisation_id = (SELECT id FROM operator_org)
UNION ALL SELECT 'audit_events', count(*) FROM audit_events WHERE organisation_id = (SELECT id FROM operator_org)
UNION ALL SELECT 'organisation_onboarding_states', count(*) FROM organisation_onboarding_states WHERE organisation_id = (SELECT id FROM operator_org);

\if :dry_run
  \echo 'DRY RUN: rolling back, nothing was changed'
  ROLLBACK;
\else
  \echo 'COMMIT'
  COMMIT;
\endif
