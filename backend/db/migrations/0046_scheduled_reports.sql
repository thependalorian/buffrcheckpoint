-- Buffr Checkpoint — scheduled reports.
--
-- Schema signed off by George on 1 October 2026 (buffrcheckpoint.md 11.1c,
-- "Gap closure"). Three reports, all delivered through the notification
-- outbox (retry, backoff and status events already covered):
--
--   ops_daily_summary         platform, daily 07:00 Africa/Windhoek, email
--                             body plus CSV attachment, to the ops inbox
--   site_manager_digest       per organisation, Monday 07:00, PDF, to
--                             owner_operator and site_manager
--   board_compliance_monthly  per organisation, 1st of the month 07:00, PDF,
--                             to owner_operator and compliance_audit_officer
--
-- Recipients are role codes resolved to verified users of the same
-- organisation at send time: never visitors or hosts, never arbitrary
-- addresses. An organisation without a configuration row gets the defaults.
-- scheduled_report_run makes delivery idempotent: one run per report,
-- organisation and period, so a restart never sends twice.

CREATE TABLE IF NOT EXISTS scheduled_report_configurations (
  id                          UUID PRIMARY KEY,
  organisation_id             UUID NULL REFERENCES organisations (id),
  report_code                 UUID NOT NULL REFERENCES type_definition (id),
  cadence_code                UUID NOT NULL REFERENCES type_definition (id),
  format_code                 UUID NOT NULL REFERENCES type_definition (id),
  recipient_references_jsonb  JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled                     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                  UUID NULL,
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_report_configurations_org_report
  ON scheduled_report_configurations (organisation_id, report_code) NULLS NOT DISTINCT
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS scheduled_report_run (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NULL REFERENCES organisations (id),
  report_code      UUID NOT NULL REFERENCES type_definition (id),
  period_key       TEXT NOT NULL,
  status_code      UUID NOT NULL REFERENCES type_definition (id),
  recipient_count  INT NULL,
  error_message    TEXT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scheduled_report_run_period
  ON scheduled_report_run (organisation_id, report_code, period_key) NULLS NOT DISTINCT;

CREATE TABLE IF NOT EXISTS scheduled_report_run_status_log (
  id                UUID PRIMARY KEY,
  organisation_id   UUID NULL REFERENCES organisations (id),
  report_run_id     UUID NOT NULL REFERENCES scheduled_report_run (id),
  from_status_code  UUID NULL REFERENCES type_definition (id),
  to_status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_run_status_log_org_run
  ON scheduled_report_run_status_log (organisation_id, report_run_id, occurred_at);

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('scheduled_report_code', 'ops_daily_summary', 'Ops daily summary', 1),
  ('scheduled_report_code', 'site_manager_digest', 'Site manager weekly digest', 2),
  ('scheduled_report_code', 'board_compliance_monthly', 'Board and compliance monthly pack', 3),
  ('schedule_cadence', 'daily_07_windhoek', 'Daily at 07:00 (Windhoek)', 1),
  ('schedule_cadence', 'weekly_monday_07', 'Mondays at 07:00 (Windhoek)', 2),
  ('schedule_cadence', 'monthly_first_07', '1st of the month at 07:00 (Windhoek)', 3),
  ('report_format', 'inline_email', 'Email body', 1),
  ('report_format', 'csv_attachment', 'Email with CSV attachment', 2),
  ('report_format', 'pdf_attachment', 'Email with PDF attachment', 3),
  ('report_run_status', 'running', 'Running', 1),
  ('report_run_status', 'succeeded', 'Succeeded', 2),
  ('report_run_status', 'failed', 'Failed', 3),
  ('report_run_status', 'skipped', 'Skipped (disabled or no recipients)', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE scheduled_report_run_status_log FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
