-- Buffr Checkpoint v0.21 — CRAN PKI alignment schema

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capability_code', 'qr_invitation_checkin', 'QR Invitation Check-In', 5
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'capability_code' AND code = 'qr_invitation_checkin');

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capability_code', 'sms_contact_confirmation', 'SMS Contact Confirmation', 6
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'capability_code' AND code = 'sms_contact_confirmation');

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capability_status_value', 'provider_testing', 'Provider testing', 10
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = 'capability_status_value' AND code = 'provider_testing');

INSERT INTO platform_capability_approvals (id, capability_code, status_code, public_display_status, updated_at)
SELECT gen_random_uuid(), cc.id, sv.id, pv.id, now()
FROM (VALUES
  ('qr_invitation_checkin', 'not_started', 'not_available'),
  ('sms_contact_confirmation', 'not_started', 'not_available')
) AS seed(capability_code, status_value, public_value)
JOIN type_definition cc ON cc.domain = 'capability_code' AND cc.code = seed.capability_code
JOIN type_definition sv ON sv.domain = 'capability_status_value' AND sv.code = seed.status_value
JOIN type_definition pv ON pv.domain = 'public_capability_status_value' AND pv.code = seed.public_value
WHERE NOT EXISTS (
  SELECT 1 FROM platform_capability_approvals pca
  JOIN type_definition td ON td.id = pca.capability_code
  WHERE td.code = seed.capability_code
);

ALTER TABLE visit_invitations
  ADD COLUMN IF NOT EXISTS token_hmac text,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS maximum_redemptions integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS redeemed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_invitations_token_hmac
  ON visit_invitations (organisation_id, token_hmac)
  WHERE token_hmac IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE visitor_identity_assessments
  ADD COLUMN IF NOT EXISTS released_attribute_codes jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_code text;

ALTER TABLE visitor_policy_acknowledgements
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id),
  ADD COLUMN IF NOT EXISTS capture_channel_code uuid REFERENCES type_definition(id);

CREATE TABLE IF NOT EXISTS reader_sessions (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  device_id uuid NOT NULL REFERENCES managed_kiosk_devices(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  trusted boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reader_sessions_org_device ON reader_sessions (organisation_id, device_id);

CREATE TABLE IF NOT EXISTS credential_use_events (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  credential_id uuid NOT NULL REFERENCES access_credentials(id),
  device_id uuid REFERENCES managed_kiosk_devices(id),
  reader_session_id uuid REFERENCES reader_sessions(id),
  site_id uuid REFERENCES sites(id),
  zone_id uuid,
  outcome_code text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_use_events_credential ON credential_use_events (credential_id, occurred_at);

CREATE TABLE IF NOT EXISTS credential_site_entitlements (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  credential_id uuid NOT NULL REFERENCES access_credentials(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  zone_id uuid,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_credential_site_entitlements_cred ON credential_site_entitlements (credential_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS feature_phone_check_in_sessions (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  site_id uuid REFERENCES sites(id),
  provider_code text NOT NULL,
  carrier_session_reference text NOT NULL,
  provider_request_id text,
  status_code text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  visit_id uuid REFERENCES visitor_visits(id)
);

CREATE INDEX IF NOT EXISTS idx_feature_phone_sessions_provider_ref
  ON feature_phone_check_in_sessions (provider_code, carrier_session_reference);

CREATE TABLE IF NOT EXISTS telecommunications_provider_arrangements (
  id uuid PRIMARY KEY,
  provider_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  webhook_secret_ref text,
  allowed_source_ips text[],
  mtls_required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO telecommunications_provider_arrangements (id, provider_code, display_name, active)
SELECT gen_random_uuid(), 'discovery', 'Discovery stub', false
WHERE NOT EXISTS (
  SELECT 1 FROM telecommunications_provider_arrangements WHERE provider_code = 'discovery'
);
