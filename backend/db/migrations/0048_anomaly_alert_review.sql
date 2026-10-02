-- Buffr Checkpoint — review states for anomaly alerts (acknowledge, dismiss).
--
-- An alert queue that only grows gets ignored. Alerts stay append-only
-- (0045 revokes UPDATE on anomaly_alert_events from the runtime role), so a
-- review is a new row here and an alert's current state is its latest row;
-- no row means open. Requested in the 2 October 2026 review of the 0045 work.

CREATE TABLE IF NOT EXISTS anomaly_alert_status_events (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  alert_id         UUID NOT NULL REFERENCES anomaly_alert_events (id),
  to_status_code   UUID NOT NULL REFERENCES type_definition (id),
  actor_id         UUID NULL,
  note             TEXT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_alert_status_events_org_alert_occurred
  ON anomaly_alert_status_events (organisation_id, alert_id, occurred_at DESC);

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('anomaly_alert_status', 'acknowledged', 'Acknowledged', 1),
  ('anomaly_alert_status', 'dismissed', 'Dismissed', 2),
  ('anomaly_alert_status', 'reopened', 'Reopened', 3)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE anomaly_alert_status_events FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
