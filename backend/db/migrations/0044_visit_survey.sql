-- Buffr Checkpoint — post-visit satisfaction micro-survey (Section 8.7).
--
-- Schema signed off by George on 1 October 2026 (buffrcheckpoint.md 11.1c,
-- "Gap closure"). Rating only in v1: no free-text comment, because a public
-- free-text box collects names and health details outside the encrypted
-- envelope. A comment column, if ever added, goes through the protected
-- personal-data envelope in its own additive migration.
--
-- Offered only on visitor sign-out (never at check-in, never on emergency
-- sign-out). One response per visit; a repeat submit is ignored.
-- Wiebe rules: client UUIDs, tenancy first in every index, soft deletes,
-- codes in type_definition, status log created with the table, no triggers,
-- no cascades.

CREATE TABLE IF NOT EXISTS visit_survey_responses (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  site_id               UUID NOT NULL REFERENCES sites (id),
  visit_id              UUID NOT NULL REFERENCES visitor_visits (id),
  rating_code           UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  capture_channel_code  UUID NULL REFERENCES type_definition (id),
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_survey_responses_org_visit
  ON visit_survey_responses (organisation_id, visit_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_visit_survey_responses_org_site_submitted
  ON visit_survey_responses (organisation_id, site_id, submitted_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS visit_survey_response_status_events (
  id                UUID PRIMARY KEY,
  organisation_id   UUID NOT NULL REFERENCES organisations (id),
  response_id       UUID NOT NULL REFERENCES visit_survey_responses (id),
  from_status_code  UUID NULL REFERENCES type_definition (id),
  to_status_code    UUID NOT NULL REFERENCES type_definition (id),
  actor_id          UUID NULL,
  reason            TEXT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_survey_response_status_events_org_response
  ON visit_survey_response_status_events (organisation_id, response_id, occurred_at);

-- PII-free rollup, rebuilt by the analytics ETL and reconciled on every run.
CREATE TABLE IF NOT EXISTS visit_survey_daily_fact (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  site_id          UUID NOT NULL REFERENCES sites (id),
  local_date       DATE NOT NULL,
  response_count   INT NOT NULL,
  rating_total     INT NOT NULL,
  satisfied_count  INT NOT NULL,
  etl_run_id       UUID NOT NULL REFERENCES analytics_etl_run (id),
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_survey_daily_fact_grain
  ON visit_survey_daily_fact (organisation_id, site_id, local_date);

-- satisfaction_rating: sort_order is the numeric score (1-5).
INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('satisfaction_rating', 'very_poor', 'Very poor', 1),
  ('satisfaction_rating', 'poor', 'Poor', 2),
  ('satisfaction_rating', 'neutral', 'Neutral', 3),
  ('satisfaction_rating', 'good', 'Good', 4),
  ('satisfaction_rating', 'very_good', 'Very good', 5),
  ('survey_response_status', 'submitted', 'Submitted', 1),
  ('survey_response_status', 'reviewed', 'Reviewed', 2),
  ('survey_response_status', 'actioned', 'Actioned', 3),
  ('survey_response_status', 'dismissed', 'Dismissed', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE visit_survey_response_status_events FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
