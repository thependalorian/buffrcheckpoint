-- Buffr Checkpoint — Canonical Engineering Constitution rename/restructure
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md, "Canonical Engineering Constitution"
-- addendum appended 2026-09-09. Renames every table to a business-capability
-- name per that document's naming convention, and restructures visitor PII
-- into a separated subject+protected-payload shape.
-- STATUS: Approved for implementation, 2026-09-09 (owner: George Nekwaya).
-- Rollback point: Neon snapshot snap-mute-shadow-arde2xqb, taken immediately
-- before this migration ran.
--
-- Scope note: covers the new document's own Phase 1 ("Complete usable
-- system"). Tables needing real device software, a real KMS, or a real
-- telecom/identity provider before they'd have any caller stay deferred with
-- Phase 2/3 (unchanged from the prior pass's scope boundary).
-- workflow_policy/workflow_policy_version/site_capture_channel_policy from
-- the prior migration are dropped as dead schema (0 rows, no caller, and no
-- longer part of the canonical model).
--
-- Every row that actually exists (confirmed via row-count query before
-- writing this migration — all synthetic smoke-test data, see
-- backend/.env.example's "DEVELOPMENT/TESTING ONLY... synthetic data only")
-- is carried forward via INSERT ... SELECT. Tables confirmed empty are
-- created fresh with no copy step.

-- ============================================================================
-- STAGE 1 — create new tables, carrying data forward where it exists
-- ============================================================================

-- --- organisations family --------------------------------------------------

CREATE TABLE organisations (
  id                     UUID PRIMARY KEY,
  legal_name             TEXT NOT NULL,
  trading_name           TEXT NULL,
  registration_reference TEXT NULL,
  sector_code            UUID NULL REFERENCES type_definition (id),
  default_timezone       TEXT NOT NULL DEFAULT 'Africa/Windhoek',
  data_residency_policy  TEXT NULL,
  deleted_at             TIMESTAMPTZ NULL
);
CREATE INDEX idx_organisations_active ON organisations (id) WHERE deleted_at IS NULL;

INSERT INTO organisations (id, legal_name, trading_name, sector_code, deleted_at)
  SELECT id, name, name, sector_code, deleted_at FROM organisation;

CREATE TABLE organisation_settings (
  id                            UUID PRIMARY KEY,
  organisation_id               UUID NOT NULL REFERENCES organisations (id),
  default_retention_policy_id   UUID NULL,
  default_language_code         UUID NULL REFERENCES type_definition (id),
  emergency_mode_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  identity_verification_policy  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_organisation_settings_org ON organisation_settings (organisation_id);

CREATE TABLE regions (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  name             TEXT NOT NULL,
  code             TEXT NULL,
  status_code      UUID NULL REFERENCES type_definition (id),
  deleted_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_regions_org ON regions (organisation_id) WHERE deleted_at IS NULL;
-- region has 0 rows — no copy needed.

CREATE TABLE sites (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  region_id        UUID NULL REFERENCES regions (id),
  name             TEXT NOT NULL,
  site_code        TEXT NULL,
  physical_address TEXT NULL,
  timezone         TEXT NOT NULL DEFAULT 'Africa/Windhoek',
  risk_tier_code   UUID NULL REFERENCES type_definition (id),
  status_code      UUID NULL REFERENCES type_definition (id),
  deleted_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_sites_org ON sites (organisation_id) WHERE deleted_at IS NULL;

INSERT INTO sites (id, organisation_id, region_id, name, risk_tier_code, deleted_at)
  SELECT id, organisation_id, region_id, name, risk_tier_code, deleted_at FROM site;

CREATE TABLE security_zones (
  id                      UUID PRIMARY KEY,
  organisation_id         UUID NOT NULL REFERENCES organisations (id),
  site_id                 UUID NOT NULL REFERENCES sites (id),
  name                    TEXT NOT NULL,
  zone_code               TEXT NULL,
  risk_tier_code          UUID NULL REFERENCES type_definition (id),
  host_approval_required  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at              TIMESTAMPTZ NULL
);
CREATE INDEX idx_security_zones_org_site ON security_zones (organisation_id, site_id) WHERE deleted_at IS NULL;
-- zone has 0 rows — no copy needed.

-- --- access model: permissions, roles, users, memberships ------------------

CREATE TABLE permission_definitions (
  permission_code     TEXT PRIMARY KEY,
  description         TEXT NOT NULL,
  risk_classification TEXT NOT NULL DEFAULT 'standard'
);

CREATE TABLE role_definitions (
  id                       UUID PRIMARY KEY,
  organisation_id          UUID NOT NULL REFERENCES organisations (id),
  role_code                UUID NOT NULL REFERENCES type_definition (id),
  role_label               TEXT NOT NULL,
  is_system_role           BOOLEAN NOT NULL DEFAULT FALSE,
  requires_mfa             BOOLEAN NOT NULL DEFAULT FALSE,
  requires_verified_email  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at               TIMESTAMPTZ NULL
);
CREATE INDEX idx_role_definitions_org ON role_definitions (organisation_id) WHERE deleted_at IS NULL;

INSERT INTO role_definitions (id, organisation_id, role_code, role_label, is_system_role, deleted_at)
  SELECT r.id, r.organisation_id, r.role_code, td.label, r.is_bundle, r.deleted_at
  FROM role r JOIN type_definition td ON td.id = r.role_code;

-- Global, seeded per role_code (not per role_definitions row) — a role_code's
-- permission set is config data, same pattern as type_definition itself.
CREATE TABLE role_permission_grants (
  role_code       UUID NOT NULL REFERENCES type_definition (id),
  permission_code TEXT NOT NULL REFERENCES permission_definitions (permission_code),
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE application_users (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  email                 TEXT NOT NULL,
  password_hash         TEXT NULL,
  email_verified_at     TIMESTAMPTZ NULL,
  mfa_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret_reference  TEXT NULL,
  status_code           UUID NULL REFERENCES type_definition (id),
  deleted_at            TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_application_users_org_email ON application_users (organisation_id, email);

INSERT INTO application_users (id, organisation_id, email, password_hash, email_verified_at, mfa_enabled, mfa_secret_reference, deleted_at)
  SELECT id, organisation_id, email, password_hash, email_verified_at, mfa_enabled, mfa_secret_reference, deleted_at FROM user_account;

CREATE TABLE password_reset_tokens (
  id           UUID PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES application_users (id),
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ NULL
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
CREATE UNIQUE INDEX idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);

INSERT INTO password_reset_tokens SELECT id, user_id, token_hash, expires_at, consumed_at FROM password_reset_token;

CREATE TABLE privileged_access_grants (
  id                  UUID PRIMARY KEY,
  organisation_id     UUID NOT NULL REFERENCES organisations (id),
  granted_to_user_id  UUID NOT NULL,
  reason_code         UUID NOT NULL REFERENCES type_definition (id),
  approved_by         UUID NOT NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ NULL,
  deleted_at          TIMESTAMPTZ NULL
);
CREATE INDEX idx_privileged_access_grants_org ON privileged_access_grants (organisation_id);
-- support_access_grant has 0 rows — no copy needed.

CREATE TABLE organisation_memberships (
  id                          UUID PRIMARY KEY,
  organisation_id             UUID NOT NULL REFERENCES organisations (id),
  user_id                     UUID NOT NULL REFERENCES application_users (id),
  role_id                     UUID NOT NULL REFERENCES role_definitions (id),
  assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  assignment_event_type_code  UUID NOT NULL REFERENCES type_definition (id),
  deleted_at                  TIMESTAMPTZ NULL
);
CREATE INDEX idx_organisation_memberships_org_user ON organisation_memberships (organisation_id, user_id);

-- role_definitions.id was carried over identical to role.id above, so
-- role_assignment.role_id values already point at valid role_definitions rows.
INSERT INTO organisation_memberships (id, organisation_id, user_id, role_id, assigned_at, assignment_event_type_code, deleted_at)
  SELECT id, organisation_id, user_id, role_id, assigned_at, assignment_event_type_code, deleted_at FROM role_assignment;

CREATE TABLE membership_scopes (
  id             UUID PRIMARY KEY,
  membership_id  UUID NOT NULL REFERENCES organisation_memberships (id),
  scope_type     TEXT NOT NULL, -- 'organisation' | 'region' | 'site'
  scope_id       UUID NULL
);
CREATE INDEX idx_membership_scopes_membership ON membership_scopes (membership_id);

INSERT INTO membership_scopes (id, membership_id, scope_type, scope_id)
  SELECT gen_random_uuid(), id, CASE WHEN site_id IS NOT NULL THEN 'site' ELSE 'organisation' END, site_id
  FROM role_assignment;

CREATE TABLE organisation_membership_status_log (
  id              UUID PRIMARY KEY,
  membership_id   UUID NOT NULL REFERENCES organisation_memberships (id),
  event_type_code UUID NOT NULL REFERENCES type_definition (id),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id        UUID NULL,
  approved_by     UUID NULL,
  reason          TEXT NULL
);
CREATE INDEX idx_org_membership_status_log_membership ON organisation_membership_status_log (membership_id, occurred_at DESC);

INSERT INTO organisation_membership_status_log
  SELECT id, role_assignment_id, event_type_code, occurred_at, actor_id, approved_by, reason FROM role_assignment_status_log;

-- --- site hosts, kiosk devices ----------------------------------------------

CREATE TABLE site_hosts (
  id                          UUID PRIMARY KEY,
  organisation_id             UUID NOT NULL REFERENCES organisations (id),
  site_id                     UUID NOT NULL REFERENCES sites (id),
  host_name_protected         JSONB NULL, -- ProtectedPersonalDataEnvelope
  host_name_lookup_hmac       TEXT NULL,
  department                  TEXT NULL,
  host_contact_protected      JSONB NULL, -- ProtectedPersonalDataEnvelope
  host_contact_lookup_hmac    TEXT NULL,
  active                      BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at                  TIMESTAMPTZ NULL
);
CREATE INDEX idx_site_hosts_org_site ON site_hosts (organisation_id, site_id) WHERE deleted_at IS NULL;

-- host has 1 row — carry it forward, wrapping today's placeholder plaintext
-- into the new envelope JSONB shape (still a local-dev stub, not real KMS
-- ciphertext, per this pass's deferred-KMS decision).
INSERT INTO site_hosts (id, organisation_id, site_id, host_name_protected, host_name_lookup_hmac, department, host_contact_protected, host_contact_lookup_hmac, active, deleted_at)
  SELECT
    id, organisation_id, site_id,
    jsonb_build_object('encryptionAlgorithm', 'LOCAL_DEV_STUB', 'keyManagementReference', 'local-dev', 'keyVersion', 1,
      'ciphertext', encode(convert_to(coalesce(name, ''), 'UTF8'), 'base64')),
    NULL,
    department,
    jsonb_build_object('encryptionAlgorithm', 'LOCAL_DEV_STUB', 'keyManagementReference', 'local-dev', 'keyVersion', 1,
      'ciphertext', encode(convert_to(coalesce(contact_reference_encrypted, ''), 'UTF8'), 'base64')),
    contact_reference_hash,
    TRUE,
    deleted_at
  FROM host;

CREATE TABLE managed_kiosk_devices (
  id                            UUID PRIMARY KEY,
  organisation_id               UUID NOT NULL REFERENCES organisations (id),
  site_id                       UUID NOT NULL REFERENCES sites (id),
  device_name                   TEXT NULL,
  manufacturer                  TEXT NOT NULL,
  model                         TEXT NOT NULL,
  serial_number                 TEXT NOT NULL,
  radio_wifi                    BOOLEAN NOT NULL DEFAULT FALSE,
  radio_bluetooth                BOOLEAN NOT NULL DEFAULT FALSE,
  radio_nfc                     BOOLEAN NOT NULL DEFAULT FALSE,
  radio_cellular                 BOOLEAN NOT NULL DEFAULT FALSE,
  cran_compliance_status_code   UUID NULL REFERENCES type_definition (id),
  cran_certificate_reference    TEXT NULL,
  supplier_evidence_reference   TEXT NULL,
  firmware_version               TEXT NULL,
  warranty_expires_at             TIMESTAMPTZ NULL,
  mdm_enrolment_status          UUID NULL REFERENCES type_definition (id),
  disposal_evidence_reference   TEXT NULL,
  deleted_at                     TIMESTAMPTZ NULL
);
CREATE INDEX idx_managed_kiosk_devices_org_site ON managed_kiosk_devices (organisation_id, site_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_managed_kiosk_devices_serial ON managed_kiosk_devices (organisation_id, serial_number);
-- device has 0 rows — no copy needed.

CREATE TABLE device_operational_status_log (
  id          UUID PRIMARY KEY,
  device_id   UUID NOT NULL REFERENCES managed_kiosk_devices (id),
  status_code UUID NOT NULL REFERENCES type_definition (id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID NULL,
  reason      TEXT NULL
);
CREATE INDEX idx_device_operational_status_log_device ON device_operational_status_log (device_id, occurred_at DESC);
-- named distinctly from the old device_status_log (0 rows, dropped in Stage 2)
-- to avoid a name collision while both exist during migration.

-- --- visitor identity + PII --------------------------------------------------

CREATE TABLE visitor_subjects (
  id                     UUID PRIMARY KEY,
  organisation_id        UUID NOT NULL REFERENCES organisations (id),
  subject_status_code    UUID NULL REFERENCES type_definition (id),
  first_seen_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_into_visitor_id UUID NULL,
  deleted_at             TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_subjects_org ON visitor_subjects (organisation_id) WHERE deleted_at IS NULL;
-- visitor has 0 rows — no copy needed.

CREATE TABLE visitor_personal_data (
  visitor_id               UUID PRIMARY KEY REFERENCES visitor_subjects (id),
  encrypted_payload         JSONB NOT NULL, -- ProtectedPersonalDataEnvelope: name/phone/etc
  name_lookup_hmac          TEXT NULL,
  phone_lookup_hmac         TEXT NULL,
  preferred_language_code   UUID NULL REFERENCES type_definition (id),
  last_rotated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitor_personal_data_phone_hmac ON visitor_personal_data (phone_lookup_hmac);

-- --- check-in forms, visitor categories, visitor policy, retention ---------

CREATE TABLE check_in_form_definitions (
  id                     UUID PRIMARY KEY,
  organisation_id        UUID NOT NULL REFERENCES organisations (id),
  visitor_category_code  UUID NOT NULL REFERENCES type_definition (id),
  site_id                UUID NULL REFERENCES sites (id),
  form_name              TEXT NULL,
  status_code            UUID NULL REFERENCES type_definition (id),
  deleted_at             TIMESTAMPTZ NULL
);
CREATE INDEX idx_check_in_form_definitions_org ON check_in_form_definitions (organisation_id) WHERE deleted_at IS NULL;
-- form_template has 0 rows — no copy needed.

CREATE TABLE check_in_form_versions (
  id                   UUID PRIMARY KEY,
  form_definition_id   UUID NOT NULL REFERENCES check_in_form_definitions (id),
  version_number       INT NOT NULL,
  effective_from       TIMESTAMPTZ NULL,
  effective_until      TIMESTAMPTZ NULL,
  approval_reference   TEXT NULL,
  status_code          UUID NULL REFERENCES type_definition (id),
  deleted_at           TIMESTAMPTZ NULL
);
CREATE INDEX idx_check_in_form_versions_definition ON check_in_form_versions (form_definition_id);
CREATE UNIQUE INDEX idx_check_in_form_versions_definition_version ON check_in_form_versions (form_definition_id, version_number);
-- form_template_version has 0 rows — no copy needed.

CREATE TABLE check_in_form_fields (
  id                        UUID PRIMARY KEY,
  form_version_id           UUID NOT NULL REFERENCES check_in_form_versions (id),
  field_code                TEXT NOT NULL,
  field_label                TEXT NULL,
  data_classification_code  UUID NOT NULL REFERENCES type_definition (id), -- domain 'field_class'
  required                  BOOLEAN NOT NULL DEFAULT FALSE,
  visibility_rule            JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_schema          JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order              INT NOT NULL DEFAULT 0,
  deleted_at                  TIMESTAMPTZ NULL
);
CREATE INDEX idx_check_in_form_fields_version ON check_in_form_fields (form_version_id);
-- form_field_definition / form_field_rule both 0 rows — no copy needed
-- (form_field_rule folds into validation_schema going forward, dropped below).

CREATE TABLE visitor_categories (
  id                            UUID PRIMARY KEY,
  organisation_id               UUID NOT NULL REFERENCES organisations (id),
  visitor_category_code         UUID NOT NULL REFERENCES type_definition (id), -- domain 'visitor_type'
  form_definition_id            UUID NOT NULL REFERENCES check_in_form_definitions (id),
  default_risk_tier_code        UUID NULL REFERENCES type_definition (id),
  default_assurance_level_code  UUID NOT NULL REFERENCES type_definition (id),
  deleted_at                    TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_categories_org ON visitor_categories (organisation_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_visitor_categories_org_code ON visitor_categories (organisation_id, visitor_category_code) WHERE deleted_at IS NULL;
-- visitor_type_policy has 0 rows — no copy needed.

CREATE TABLE visitor_policy_documents (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  policy_code      TEXT NOT NULL,
  policy_name      TEXT NULL,
  category         TEXT NULL,
  deleted_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_policy_documents_org ON visitor_policy_documents (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE visitor_policy_versions (
  id                   UUID PRIMARY KEY,
  policy_document_id   UUID NOT NULL REFERENCES visitor_policy_documents (id),
  version_number        INT NOT NULL,
  content_artifact_id   TEXT NULL,
  content_hash          TEXT NOT NULL,
  language_code         UUID NOT NULL REFERENCES type_definition (id),
  effective_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_code            UUID NULL REFERENCES type_definition (id),
  deleted_at              TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_policy_versions_document ON visitor_policy_versions (policy_document_id);
-- consent_agreement / consent_acknowledgement both 0 rows — no copy needed.

CREATE TABLE retention_policies (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  site_id          UUID NULL REFERENCES sites (id),
  retention_days   INT NOT NULL,
  version          INT NOT NULL DEFAULT 1,
  deleted_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_retention_policies_org_site ON retention_policies (organisation_id, site_id);
-- retention_policy has 0 rows — no copy needed.

CREATE TABLE legal_holds (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  scope            JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_legal_holds_org ON legal_holds (organisation_id);

CREATE TABLE legal_hold_status_events (
  id            UUID PRIMARY KEY,
  legal_hold_id UUID NOT NULL REFERENCES legal_holds (id),
  status_code   UUID NOT NULL REFERENCES type_definition (id),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id      UUID NULL,
  reason        TEXT NULL
);
CREATE INDEX idx_legal_hold_status_events_hold ON legal_hold_status_events (legal_hold_id, occurred_at DESC);
-- legal_hold / legal_hold_status_log both 0 rows — no copy needed.

-- --- visit invitations, visits, status events, identity assessments --------

CREATE TABLE visit_invitations (
  id                              UUID PRIMARY KEY,
  organisation_id                 UUID NOT NULL REFERENCES organisations (id),
  site_id                         UUID NOT NULL REFERENCES sites (id),
  host_id                         UUID NOT NULL REFERENCES site_hosts (id),
  visitor_reference                TEXT NOT NULL,
  invitation_code                  TEXT NOT NULL,
  expected_from                    TIMESTAMPTZ NULL,
  expected_until                   TIMESTAMPTZ NULL,
  status_code                      UUID NOT NULL REFERENCES type_definition (id),
  verification_requirement_code    UUID NULL REFERENCES type_definition (id),
  deleted_at                       TIMESTAMPTZ NULL
);
CREATE INDEX idx_visit_invitations_org_site ON visit_invitations (organisation_id, site_id);
CREATE UNIQUE INDEX idx_visit_invitations_code ON visit_invitations (organisation_id, invitation_code);

CREATE TABLE visit_invitation_status_events (
  id             UUID PRIMARY KEY,
  invitation_id  UUID NOT NULL REFERENCES visit_invitations (id),
  status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       UUID NULL,
  reason         TEXT NULL
);
CREATE INDEX idx_visit_invitation_status_events_invitation ON visit_invitation_status_events (invitation_id, occurred_at DESC);
-- visit_invitation / visit_invitation_status_log both 0 rows — no copy needed.

CREATE TABLE visitor_visits (
  id                              UUID PRIMARY KEY,
  organisation_id                 UUID NOT NULL REFERENCES organisations (id),
  site_id                         UUID NOT NULL REFERENCES sites (id),
  zone_id                         UUID NULL REFERENCES security_zones (id),
  visitor_id                      UUID NULL REFERENCES visitor_subjects (id),
  host_id                         UUID NOT NULL REFERENCES site_hosts (id),
  visitor_category_code           UUID NOT NULL REFERENCES type_definition (id),
  invitation_id                   UUID NULL REFERENCES visit_invitations (id),
  purpose_category_code           UUID NULL REFERENCES type_definition (id),
  arrival_channel_code            UUID NOT NULL REFERENCES type_definition (id),
  status_code                     UUID NOT NULL REFERENCES type_definition (id),
  identity_assurance_level_code   UUID NULL REFERENCES type_definition (id),
  access_decision_code            UUID NULL REFERENCES type_definition (id),
  photo_reference                 TEXT NULL,
  notes                           TEXT NULL,
  checked_in_at                   TIMESTAMPTZ NOT NULL,
  server_accepted_at              TIMESTAMPTZ NULL,
  checked_out_at                  TIMESTAMPTZ NULL,
  offline_captured                BOOLEAN NOT NULL DEFAULT FALSE,
  retention_policy_version        INT NOT NULL,
  idempotency_key                 TEXT NULL,
  deleted_at                       TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_visits_org_site ON visitor_visits (organisation_id, site_id);
CREATE INDEX idx_visitor_visits_org_visitor ON visitor_visits (organisation_id, visitor_id);
CREATE UNIQUE INDEX idx_visitor_visits_org_idempotency_key ON visitor_visits (organisation_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- visit has 1 row — carry it forward. host_id: visit.hostId already points
-- at a host row whose id was carried unchanged into site_hosts above.
INSERT INTO visitor_visits (id, organisation_id, site_id, zone_id, visitor_id, host_id, visitor_category_code, invitation_id, purpose_category_code, arrival_channel_code, status_code, photo_reference, notes, checked_in_at, server_accepted_at, checked_out_at, offline_captured, retention_policy_version, idempotency_key, deleted_at)
  SELECT id, organisation_id, site_id, zone_id, visitor_id, host_id, visitor_type_code, invitation_id, purpose_category_code, capture_channel_code, status_code, photo_reference, notes, checked_in_at, server_accepted_at, checked_out_at, offline_captured, retention_policy_version, idempotency_key, deleted_at
  FROM visit;

CREATE TABLE visit_status_events (
  id                UUID PRIMARY KEY,
  visit_id          UUID NOT NULL REFERENCES visitor_visits (id),
  from_status_code  UUID NULL REFERENCES type_definition (id),
  to_status_code    UUID NOT NULL REFERENCES type_definition (id),
  reason_code       UUID NULL REFERENCES type_definition (id),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id          UUID NULL,
  device_id         UUID NULL REFERENCES managed_kiosk_devices (id)
);
CREATE INDEX idx_visit_status_events_visit ON visit_status_events (visit_id, occurred_at DESC);

INSERT INTO visit_status_events (id, visit_id, to_status_code, occurred_at, actor_id)
  SELECT id, visit_id, status_code, occurred_at, actor_id FROM visit_status_log;

CREATE TABLE visitor_policy_acknowledgements (
  id                            UUID PRIMARY KEY,
  organisation_id               UUID NOT NULL REFERENCES organisations (id),
  visit_id                      UUID NOT NULL REFERENCES visitor_visits (id),
  policy_version_id             UUID NOT NULL REFERENCES visitor_policy_versions (id),
  legal_basis_code              UUID NOT NULL REFERENCES type_definition (id),
  language_shown_code           UUID NOT NULL REFERENCES type_definition (id),
  displayed_at                   TIMESTAMPTZ NOT NULL,
  accepted_at                    TIMESTAMPTZ NULL,
  acknowledgement_method_code    UUID NOT NULL REFERENCES type_definition (id),
  signature_artifact_id          TEXT NULL,
  device_id                      UUID NULL REFERENCES managed_kiosk_devices (id),
  deleted_at                      TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_policy_acknowledgements_org_visit ON visitor_policy_acknowledgements (organisation_id, visit_id);
-- consent_acknowledgement has 0 rows — no copy needed.

CREATE TABLE visitor_identity_assessments (
  id                            UUID PRIMARY KEY,
  visit_id                      UUID NOT NULL REFERENCES visitor_visits (id),
  verification_provider_code    UUID NOT NULL REFERENCES type_definition (id),
  assurance_level_code          UUID NOT NULL REFERENCES type_definition (id),
  outcome_reference               TEXT NULL,
  verified_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                       TIMESTAMPTZ NULL
);
CREATE INDEX idx_visitor_identity_assessments_visit ON visitor_identity_assessments (visit_id);
-- identity_verification_event has 0 rows — no copy needed.

-- --- access credentials -----------------------------------------------------

CREATE TABLE access_credentials (
  id                          UUID PRIMARY KEY,
  organisation_id             UUID NOT NULL REFERENCES organisations (id),
  holder_type_code            UUID NOT NULL REFERENCES type_definition (id),
  holder_id                   UUID NULL,
  credential_type_code        UUID NOT NULL REFERENCES type_definition (id),
  credential_reference_hmac   TEXT NOT NULL,
  valid_from                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until                 TIMESTAMPTZ NULL,
  deleted_at                  TIMESTAMPTZ NULL
);
CREATE INDEX idx_access_credentials_org ON access_credentials (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE credential_status_events (
  id             UUID PRIMARY KEY,
  credential_id  UUID NOT NULL REFERENCES access_credentials (id),
  status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       UUID NULL,
  reason         TEXT NULL
);
CREATE INDEX idx_credential_status_events_credential ON credential_status_events (credential_id, occurred_at DESC);
-- credential / credential_status_log both 0 rows — no copy needed.

-- --- privacy requests, notifications, emergency roll-call, audit -----------

CREATE TABLE privacy_requests (
  id                 UUID PRIMARY KEY,
  organisation_id    UUID NOT NULL REFERENCES organisations (id),
  subject_reference  TEXT NOT NULL,
  request_type_code  UUID NOT NULL REFERENCES type_definition (id),
  status_code        UUID NOT NULL REFERENCES type_definition (id),
  deleted_at         TIMESTAMPTZ NULL
);
CREATE INDEX idx_privacy_requests_org ON privacy_requests (organisation_id);

INSERT INTO privacy_requests SELECT id, organisation_id, subject_reference, request_type_code, status_code, deleted_at FROM data_subject_request;

CREATE TABLE privacy_request_status_log (
  id          UUID PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES privacy_requests (id),
  status_code UUID NOT NULL REFERENCES type_definition (id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID NULL,
  reason      TEXT NULL
);
CREATE INDEX idx_privacy_request_status_log_request ON privacy_request_status_log (request_id, occurred_at DESC);

INSERT INTO privacy_request_status_log SELECT id, request_id, status_code, occurred_at, actor_id, reason FROM dsar_status_log;

CREATE TABLE notification_delivery_instructions (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  visit_id              UUID NULL REFERENCES visitor_visits (id),
  recipient_reference   TEXT NOT NULL,
  channel_code          UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  sent_at               TIMESTAMPTZ NULL,
  deleted_at            TIMESTAMPTZ NULL
);
CREATE INDEX idx_notification_delivery_instructions_visit ON notification_delivery_instructions (visit_id);
-- notification_event has 0 rows — no copy needed.

CREATE TABLE emergency_roll_call_events (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  site_id          UUID NOT NULL REFERENCES sites (id),
  activated_by     UUID NULL,
  activated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at        TIMESTAMPTZ NULL,
  deleted_at       TIMESTAMPTZ NULL
);
CREATE INDEX idx_emergency_roll_call_events_org_site ON emergency_roll_call_events (organisation_id, site_id);
-- emergency_event has 0 rows — no copy needed.

CREATE TABLE emergency_roll_call_entries (
  id                  UUID PRIMARY KEY,
  roll_call_event_id  UUID NOT NULL REFERENCES emergency_roll_call_events (id),
  visit_id            UUID NOT NULL REFERENCES visitor_visits (id),
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_emergency_roll_call_entries_event ON emergency_roll_call_entries (roll_call_event_id);
-- emergency_roster_snapshot has 0 rows — no copy needed.

CREATE TABLE audit_events (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  actor_id         UUID NULL,
  action_code      TEXT NOT NULL,
  resource_type    TEXT NOT NULL,
  resource_id      UUID NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_id       TEXT NULL,
  prev_event_hash  TEXT NULL,
  event_hash       TEXT NOT NULL
);
CREATE INDEX idx_audit_events_org_occurred ON audit_events (organisation_id, occurred_at DESC);

INSERT INTO audit_events (id, organisation_id, actor_id, action_code, resource_type, resource_id, occurred_at, prev_event_hash, event_hash)
  SELECT id, organisation_id, actor_id, action, resource_type, resource_id, occurred_at, prev_event_hash, event_hash FROM audit_event;

CREATE TABLE platform_capability_approvals (
  id                     UUID PRIMARY KEY,
  capability_code        UUID NOT NULL REFERENCES type_definition (id),
  status_code            UUID NOT NULL REFERENCES type_definition (id),
  evidence_reference     TEXT NULL,
  approved_by            UUID NULL,
  approved_at            TIMESTAMPTZ NULL,
  public_display_status  UUID NOT NULL REFERENCES type_definition (id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_platform_capability_approvals_code ON platform_capability_approvals (capability_code);

INSERT INTO platform_capability_approvals (id, capability_code, status_code, evidence_reference, approved_by, approved_at, public_display_status, updated_at)
  SELECT id, capability_code, status_code, evidence_reference, confirmed_by, confirmed_at, public_display_status, updated_at FROM platform_capability_status;
