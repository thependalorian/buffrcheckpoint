-- Pre-check-in privacy acknowledgement (before visit row exists) + visit status extensions
-- STATUS: Applied 2026-09-11; live on Neon falling-frog-15538162

CREATE TABLE kiosk_privacy_pre_checkin_acknowledgements (
  id                          UUID PRIMARY KEY,
  organisation_id             UUID NOT NULL REFERENCES organisations (id),
  site_id                     UUID NOT NULL REFERENCES sites (id),
  kiosk_session_id            UUID NOT NULL,
  policy_version_id           UUID NOT NULL REFERENCES visitor_policy_versions (id),
  legal_basis_code            UUID NOT NULL REFERENCES type_definition (id),
  language_shown_code         UUID NOT NULL REFERENCES type_definition (id),
  acknowledgement_method_code UUID NOT NULL REFERENCES type_definition (id),
  displayed_at                TIMESTAMPTZ NOT NULL,
  accepted_at                 TIMESTAMPTZ NULL,
  device_id                   UUID NULL REFERENCES managed_kiosk_devices (id)
);

CREATE INDEX idx_kiosk_privacy_pre_checkin_ack_org_site
  ON kiosk_privacy_pre_checkin_acknowledgements (organisation_id, site_id, displayed_at DESC);

CREATE UNIQUE INDEX idx_kiosk_privacy_pre_checkin_ack_session
  ON kiosk_privacy_pre_checkin_acknowledgements (kiosk_session_id);

INSERT INTO type_definition (domain, code, label, sort_order)
VALUES
  ('visit_status', 'pending_approval', 'Pending host approval', 5),
  ('visit_status', 'admitted', 'Admitted', 6),
  ('visit_status', 'entry_rejected', 'Entry rejected', 7)
ON CONFLICT DO NOTHING;
