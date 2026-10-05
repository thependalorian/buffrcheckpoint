-- Secure customer onboarding: email verification, MFA recovery, org onboarding lifecycle
-- STATUS: Applied 2026-09-11; live on Neon falling-frog-15538162

INSERT INTO type_definition (domain, code, label, sort_order)
VALUES
  ('organisation_onboarding_status', 'pending_email_verification', 'Pending email verification', 10),
  ('organisation_onboarding_status', 'email_verified', 'Email verified', 20),
  ('organisation_onboarding_status', 'mfa_enrolled', 'MFA enrolled', 30),
  ('organisation_onboarding_status', 'in_progress', 'Onboarding in progress', 40),
  ('organisation_onboarding_status', 'ready_for_golive', 'Ready for go-live review', 50),
  ('organisation_onboarding_status', 'live', 'Live', 60),
  ('organisation_onboarding_status', 'suspended', 'Suspended', 70),
  ('onboarding_step_code', 'organisation_profile', 'Organisation profile', 10),
  ('onboarding_step_code', 'branding', 'Branding', 20),
  ('onboarding_step_code', 'site_hierarchy', 'Region / site / zone', 30),
  ('onboarding_step_code', 'hosts_departments', 'Hosts and departments', 40),
  ('onboarding_step_code', 'visitor_categories', 'Visitor categories', 50),
  ('onboarding_step_code', 'check_in_channels', 'Check-in channels', 60),
  ('onboarding_step_code', 'risk_identity_approval', 'Risk, identity and approval', 70),
  ('onboarding_step_code', 'notices_retention', 'Notices, agreements and retention', 80),
  ('onboarding_step_code', 'devices_mdm', 'Devices and MDM', 90),
  ('onboarding_step_code', 'cran_evidence', 'CRAN device-compliance evidence', 100),
  ('onboarding_step_code', 'flow_tests', 'Online / offline / accessibility / emergency tests', 110),
  ('onboarding_step_code', 'role_training', 'Role training acknowledgement', 120),
  ('onboarding_step_code', 'golive_approval', 'Go-live approval', 130)
ON CONFLICT DO NOTHING;

CREATE TABLE email_verification_tokens (
  id              UUID PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations (id),
  user_id         UUID NOT NULL REFERENCES application_users (id),
  token_hash      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_email_verification_tokens_hash
  ON email_verification_tokens (token_hash);

CREATE INDEX idx_email_verification_tokens_org_user
  ON email_verification_tokens (organisation_id, user_id)
  WHERE consumed_at IS NULL;

CREATE TABLE mfa_recovery_codes (
  id              UUID PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations (id),
  user_id         UUID NOT NULL REFERENCES application_users (id),
  code_hash       TEXT NOT NULL,
  consumed_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ NULL
);

CREATE INDEX idx_mfa_recovery_codes_org_user
  ON mfa_recovery_codes (organisation_id, user_id)
  WHERE deleted_at IS NULL AND consumed_at IS NULL;

CREATE TABLE organisation_onboarding_states (
  id                   UUID PRIMARY KEY,
  organisation_id      UUID NOT NULL REFERENCES organisations (id),
  status_code          UUID NOT NULL REFERENCES type_definition (id),
  current_step_code    UUID NULL REFERENCES type_definition (id),
  completed_step_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  golive_approved_at   TIMESTAMPTZ NULL,
  golive_approved_by   UUID NULL REFERENCES application_users (id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_organisation_onboarding_states_org_active
  ON organisation_onboarding_states (organisation_id)
  WHERE deleted_at IS NULL;

CREATE TABLE organisation_onboarding_status_log (
  id              UUID PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations (id),
  state_id        UUID NOT NULL REFERENCES organisation_onboarding_states (id),
  from_status_code UUID NULL REFERENCES type_definition (id),
  to_status_code  UUID NOT NULL REFERENCES type_definition (id),
  step_code       UUID NULL REFERENCES type_definition (id),
  actor_id        UUID NULL,
  reason          TEXT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organisation_onboarding_status_log_org
  ON organisation_onboarding_status_log (organisation_id, occurred_at DESC);

CREATE TABLE mfa_challenge_tokens (
  id              UUID PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations (id),
  user_id         UUID NOT NULL REFERENCES application_users (id),
  token_hash      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mfa_challenge_tokens_hash
  ON mfa_challenge_tokens (token_hash);

CREATE INDEX idx_mfa_challenge_tokens_org_user
  ON mfa_challenge_tokens (organisation_id, user_id)
  WHERE consumed_at IS NULL;
