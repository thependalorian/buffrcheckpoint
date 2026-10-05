-- Append-only log of escalation actions applied (Section 11.9.8.4 worker)
-- STATUS: Applied 2026-09-11; live on Neon falling-frog-15538162

CREATE TABLE host_notification_escalation_events (
  id                           UUID PRIMARY KEY,
  organisation_id              UUID NOT NULL REFERENCES organisations (id),
  site_id                      UUID NOT NULL REFERENCES sites (id),
  visit_id                     UUID NOT NULL REFERENCES visitor_visits (id),
  escalation_policy_version_id UUID NOT NULL REFERENCES host_notification_escalation_policy_versions (id),
  escalation_action_code       UUID NOT NULL REFERENCES type_definition (id),
  occurred_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_host_notification_escalation_events_visit
  ON host_notification_escalation_events (visit_id, occurred_at);

CREATE INDEX idx_host_notification_escalation_events_org_site
  ON host_notification_escalation_events (organisation_id, site_id, occurred_at);
