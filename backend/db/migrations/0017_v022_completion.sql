-- Buffr Checkpoint v0.22 — complete partial wiring (schema completion)

ALTER TABLE visit_invitations
  ADD COLUMN IF NOT EXISTS visitor_category_code uuid REFERENCES type_definition (id);

ALTER TABLE kiosk_privacy_pre_checkin_acknowledgements
  ADD COLUMN IF NOT EXISTS capture_channel_code uuid REFERENCES type_definition (id);

CREATE TABLE IF NOT EXISTS feature_phone_check_in_session_status_log (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES feature_phone_check_in_sessions (id),
  status_code text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  reason text
);

CREATE INDEX IF NOT EXISTS idx_fp_session_status_log
  ON feature_phone_check_in_session_status_log (session_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS sms_contact_confirmation_events (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations (id),
  visit_id uuid REFERENCES visitor_visits (id),
  site_id uuid REFERENCES sites (id),
  provider_code text NOT NULL,
  recipient_reference_hmac text NOT NULL,
  message_reference text NOT NULL,
  outcome_code text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_confirmation_org_visit
  ON sms_contact_confirmation_events (organisation_id, visit_id, occurred_at DESC);

-- National e-ID context note (internal evidence only — does not change public status)
UPDATE platform_capability_approvals pca
SET evidence_reference = 'CRAN roadmap Jul 2026: MHAISS first accredited CSP for e-ID rollout. ETA s20+Ch5 commenced 15 Jun 2026 (GN 182/2026).'
FROM type_definition td
WHERE pca.capability_code = td.id
  AND td.domain = 'capability_code'
  AND td.code = 'national_eid_nfc'
  AND (pca.evidence_reference IS NULL OR btrim(pca.evidence_reference) = '');
