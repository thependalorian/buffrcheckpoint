-- Buffr Checkpoint — analytics ETL: run history + PII-free visit rollups.
--
-- Source of truth: buffrcheckpoint.md "Analytics and ETL".
--
-- visit_daily_fact / visit_hourly_fact are DERIVED rollups of visitor_visits:
-- counts and dwell totals only, no visitor, host or free-text columns. They are
-- recomputed in place by the ETL (INSERT ... ON CONFLICT DO UPDATE) for every
-- local date in a run's window. Run history (analytics_etl_run) is stateful and
-- has its status log created alongside it; the log is append-only.
--
-- No triggers, no cascades, no CHECK lists: statuses and run kinds live in
-- type_definition. Local dates use each site's own `sites.timezone`.

CREATE TABLE IF NOT EXISTS analytics_etl_run (
  id                  UUID PRIMARY KEY,
  run_kind_code       UUID NOT NULL REFERENCES type_definition (id),
  status_code         UUID NOT NULL REFERENCES type_definition (id),
  window_from         DATE NOT NULL,
  window_to           DATE NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at         TIMESTAMPTZ NULL,
  rows_written        INT NULL,
  source_visit_count  INT NULL,
  fact_visit_count    INT NULL,
  error_message       TEXT NULL,
  requested_by        UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_etl_run_started
  ON analytics_etl_run (started_at DESC);

CREATE TABLE IF NOT EXISTS analytics_etl_run_status_log (
  id                UUID PRIMARY KEY,
  etl_run_id        UUID NOT NULL REFERENCES analytics_etl_run (id),
  from_status_code  UUID NULL REFERENCES type_definition (id),
  to_status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_etl_run_status_log_run
  ON analytics_etl_run_status_log (etl_run_id, occurred_at);

CREATE TABLE IF NOT EXISTS visit_daily_fact (
  id                      UUID PRIMARY KEY,
  organisation_id         UUID NOT NULL REFERENCES organisations (id),
  site_id                 UUID NOT NULL REFERENCES sites (id),
  local_date              DATE NOT NULL,
  visitor_type_code       UUID NOT NULL REFERENCES type_definition (id),
  arrival_channel_code    UUID NOT NULL REFERENCES type_definition (id),
  purpose_category_code   UUID NULL REFERENCES type_definition (id),
  check_in_count          INT NOT NULL,
  check_out_count         INT NOT NULL,
  offline_captured_count  INT NOT NULL,
  dwell_minutes_total     NUMERIC(14,2) NOT NULL,
  dwell_sample_count      INT NOT NULL,
  etl_run_id              UUID NOT NULL REFERENCES analytics_etl_run (id),
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_daily_fact_grain
  ON visit_daily_fact (organisation_id, site_id, local_date, visitor_type_code, arrival_channel_code, purpose_category_code)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_visit_daily_fact_org_date
  ON visit_daily_fact (organisation_id, local_date);

CREATE TABLE IF NOT EXISTS visit_hourly_fact (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  site_id          UUID NOT NULL REFERENCES sites (id),
  local_date       DATE NOT NULL,
  local_hour       SMALLINT NOT NULL,
  check_in_count   INT NOT NULL,
  etl_run_id       UUID NOT NULL REFERENCES analytics_etl_run (id),
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_hourly_fact_grain
  ON visit_hourly_fact (organisation_id, site_id, local_date, local_hour);

CREATE INDEX IF NOT EXISTS idx_visit_hourly_fact_org_date
  ON visit_hourly_fact (organisation_id, local_date);

-- Supports the ETL's late-sync lookup (visits accepted after the last run).
CREATE INDEX IF NOT EXISTS idx_visitor_visits_org_server_accepted
  ON visitor_visits (organisation_id, server_accepted_at)
  WHERE deleted_at IS NULL;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('etl_run_status', 'running', 'Running', 1),
  ('etl_run_status', 'succeeded', 'Succeeded', 2),
  ('etl_run_status', 'failed', 'Failed', 3),
  ('etl_run_kind', 'incremental', 'Incremental', 1),
  ('etl_run_kind', 'backfill', 'Backfill', 2)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('platform.analytics.manage', 'Run analytics ETL backfills', 'standard')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    ('platform_support', 'platform.analytics.manage')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Append-only status log for the least-privilege runtime role (see 0024).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE analytics_etl_run_status_log FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
