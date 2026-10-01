-- Buffr Checkpoint — retention disposition: run history for the job that
-- executes retention policies.
--
-- Source of truth: buffrcheckpoint.md "Retention purge/archive job" (§11.9.0a).
--
-- One run row per organisation per execution. A run soft-deletes visits whose
-- check-out is older than the effective retention policy (site row, else the
-- organisation default), skips anything covered by an active legal hold, and
-- crypto-shreds the personal-data envelope of visitor subjects left with no
-- live visits. All of that is application code (RetentionDispositionService);
-- this migration only adds history tables and config rows.
--
-- Stateful run table + append-only status log created together. No triggers,
-- no cascades, no CHECK lists: statuses live in type_definition.

CREATE TABLE IF NOT EXISTS retention_disposition_run (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  status_code      UUID NOT NULL REFERENCES type_definition (id),
  dry_run          BOOLEAN NOT NULL DEFAULT FALSE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ NULL,
  candidate_count  INT NULL,
  disposed_count   INT NULL,
  held_count       INT NULL,
  shredded_subject_count INT NULL,
  error_message    TEXT NULL,
  requested_by     UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_disposition_run_org_started
  ON retention_disposition_run (organisation_id, started_at DESC);

CREATE TABLE IF NOT EXISTS retention_disposition_run_status_log (
  id                 UUID PRIMARY KEY,
  disposition_run_id UUID NOT NULL REFERENCES retention_disposition_run (id),
  from_status_code   UUID NULL REFERENCES type_definition (id),
  to_status_code     UUID NOT NULL REFERENCES type_definition (id),
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_disposition_run_status_log_run
  ON retention_disposition_run_status_log (disposition_run_id, occurred_at);

-- Candidate lookup: checked-out, live visits per organisation by check-out time.
CREATE INDEX IF NOT EXISTS idx_visitor_visits_org_checked_out
  ON visitor_visits (organisation_id, checked_out_at)
  WHERE deleted_at IS NULL;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('retention_run_status', 'running', 'Running', 1),
  ('retention_run_status', 'succeeded', 'Succeeded', 2),
  ('retention_run_status', 'failed', 'Failed', 3),
  ('visit_status', 'disposed', 'Disposed under retention policy', 8)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('platform.retention.manage', 'Run retention disposition (soft-delete expired visits, shred personal data)', 'critical')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    ('platform_support', 'platform.retention.manage')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Append-only status log for the least-privilege runtime role (see 0024).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE retention_disposition_run_status_log FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
