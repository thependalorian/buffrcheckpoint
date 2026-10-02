-- Buffr Checkpoint — live anomaly rules (two rules, v1).
--
-- Schema signed off by George on 1 October 2026 (buffrcheckpoint.md 11.1c,
-- "Gap closure"). Rules are evaluated in the API on every check-in (the same
-- visit.roster_changed signal that drives the live roster). They alert people
-- only; they never deny or delay a visitor (Section 7.2 guardrail).
--
--   repeat_phone_window          same phone (lookup HMAC) checks in N times
--                                within M minutes at one site. Default 3 / 30.
--   after_hours_restricted_zone  check-in to a zone at risk tier 3 or above
--                                outside the site's visitor hours. Default
--                                hours 07:00-18:00 site-local, threshold 1.
--
-- A site with no configuration row uses the defaults, so no site is silently
-- unmonitored. Alerts hold references only (rule, site, visit id, lookup
-- HMAC), never visitor details, and are append-only.

CREATE TABLE IF NOT EXISTS site_anomaly_rule_configurations (
  id                  UUID PRIMARY KEY,
  organisation_id     UUID NOT NULL REFERENCES organisations (id),
  site_id             UUID NOT NULL REFERENCES sites (id),
  rule_code           UUID NOT NULL REFERENCES type_definition (id),
  threshold_int       INT NOT NULL,
  window_minutes      INT NULL,
  window_start_local  TIME NULL,
  window_end_local    TIME NULL,
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID NULL,
  deleted_at          TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_site_anomaly_rule_configurations_org_site_rule
  ON site_anomaly_rule_configurations (organisation_id, site_id, rule_code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS anomaly_alert_events (
  id                 UUID PRIMARY KEY,
  organisation_id    UUID NOT NULL REFERENCES organisations (id),
  site_id            UUID NOT NULL REFERENCES sites (id),
  rule_code          UUID NOT NULL REFERENCES type_definition (id),
  visit_id           UUID NULL REFERENCES visitor_visits (id),
  subject_reference  TEXT NULL,
  payload_jsonb      JSONB NULL,
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_alert_events_org_site_occurred
  ON anomaly_alert_events (organisation_id, site_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_anomaly_alert_events_org_rule_subject
  ON anomaly_alert_events (organisation_id, site_id, rule_code, subject_reference, occurred_at DESC);

-- Repeat-phone lookup: recent check-ins per site.
CREATE INDEX IF NOT EXISTS idx_visitor_visits_org_site_checked_in
  ON visitor_visits (organisation_id, site_id, checked_in_at)
  WHERE deleted_at IS NULL;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('anomaly_rule_code', 'repeat_phone_window', 'Same phone checking in repeatedly', 1),
  ('anomaly_rule_code', 'after_hours_restricted_zone', 'After-hours check-in to a restricted zone', 2)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE anomaly_alert_events FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
