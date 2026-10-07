-- Buffr Checkpoint — Release 1 schema
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md, Section 11.4.5
-- STATUS: Approved for Release 1 implementation, 2026-09-09 (owner: George Nekwaya)
-- Follows this workspace's Wiebe schema-design rules (SYSTEM_DESIGN_MASTER_GUIDE.md
-- § "Wiebe's Approach: Schema Design Rules"): UUID PKs generated client-side
-- (type_definition is the one admin-seeded exception), type_code config tables
-- instead of enums, _status_log companion tables on every stateful entity,
-- zero triggers/stored procedures/ON DELETE CASCADE, soft deletes only,
-- organisation_id tenancy column leading every index.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- type-definitions.ts
-- ============================================================================

CREATE TABLE type_definition (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- admin-seeded exception, rule 1
  domain      TEXT NOT NULL,
  code        TEXT NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_type_definition_domain_code
  ON type_definition (domain, code) WHERE deleted_at IS NULL;

-- ============================================================================
-- organisations.ts
-- ============================================================================

CREATE TABLE organisation (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  sector_code UUID NULL REFERENCES type_definition (id),
  deleted_at  TIMESTAMPTZ NULL
);

CREATE INDEX idx_organisation_active
  ON organisation (id) WHERE deleted_at IS NULL;

CREATE TABLE region (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  name             TEXT NOT NULL,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_region_org
  ON region (organisation_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- sites.ts
-- ============================================================================

CREATE TABLE site (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  region_id        UUID NULL REFERENCES region (id),
  name             TEXT NOT NULL,
  risk_tier_code   UUID NULL REFERENCES type_definition (id),
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_org
  ON site (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE zone (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  site_id          UUID NOT NULL REFERENCES site (id),
  name             TEXT NOT NULL,
  risk_tier_code   UUID NULL REFERENCES type_definition (id),
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_zone_org_site
  ON zone (organisation_id, site_id) WHERE deleted_at IS NULL;

-- Rotating USSD/kiosk site code (Section 6.2). Append-only: a new row per
-- rotation, never an UPDATE — rule 4 exception, the table IS the log.
CREATE TABLE site_checkin_code (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  site_id          UUID NOT NULL REFERENCES site (id),
  code             TEXT NOT NULL,
  active_from      TIMESTAMPTZ NOT NULL,
  active_until     TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_site_checkin_code_org_site_active
  ON site_checkin_code (organisation_id, site_id, active_until DESC);

-- Full Device Compliance Register field set per Addendum §2.2.
-- "No unregistered device should be deployable."
CREATE TABLE device (
  id                        UUID PRIMARY KEY,
  organisation_id           UUID NOT NULL REFERENCES organisation (id),
  site_id                   UUID NOT NULL REFERENCES site (id),
  manufacturer              TEXT NOT NULL,
  model                     TEXT NOT NULL,
  serial_number             TEXT NOT NULL,
  radio_wifi                BOOLEAN NOT NULL DEFAULT FALSE,
  radio_bluetooth           BOOLEAN NOT NULL DEFAULT FALSE,
  radio_nfc                 BOOLEAN NOT NULL DEFAULT FALSE,
  radio_cellular             BOOLEAN NOT NULL DEFAULT FALSE,
  cran_status_code           UUID NULL REFERENCES type_definition (id),
  cran_certificate_reference TEXT NULL,
  supplier_evidence_reference TEXT NULL,
  firmware_version           TEXT NULL,
  warranty_expires_at        TIMESTAMPTZ NULL,
  mdm_enrolled                BOOLEAN NOT NULL DEFAULT FALSE,
  disposal_evidence_reference TEXT NULL,
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_device_org_site
  ON device (organisation_id, site_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_device_serial
  ON device (organisation_id, serial_number) WHERE deleted_at IS NULL;

CREATE TABLE device_status_log (  -- immutable
  id           UUID PRIMARY KEY,
  device_id    UUID NOT NULL REFERENCES device (id),
  status_code  UUID NOT NULL REFERENCES type_definition (id),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID NULL,
  reason       TEXT NULL
);

CREATE INDEX idx_device_status_log_device
  ON device_status_log (device_id, occurred_at DESC);

CREATE TABLE access_policy (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  site_id          UUID NULL REFERENCES site (id),
  zone_id          UUID NULL REFERENCES zone (id),
  config           JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_access_policy_org
  ON access_policy (organisation_id) WHERE deleted_at IS NULL;

-- site_id nullable: a null site_id is the organisation's default policy.
-- Addendum §7.1's "Public-Sector Tenant Policy" is this same table with
-- organisation.sector_code = 'government', not a separate table (rule 2).
CREATE TABLE retention_policy (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  site_id          UUID NULL REFERENCES site (id),
  retention_days   INT NOT NULL,
  version          INT NOT NULL DEFAULT 1,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_retention_policy_org_site
  ON retention_policy (organisation_id, site_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- hosts.ts
-- Section 11.3's "Host / Staff Directory" — distinct from user_account: a
-- host is who a visit is notified to, not necessarily an admin-app login.
-- ============================================================================

CREATE TABLE host (
  id                UUID PRIMARY KEY,
  organisation_id   UUID NOT NULL REFERENCES organisation (id),
  site_id           UUID NOT NULL REFERENCES site (id),
  name              TEXT NOT NULL,
  department        TEXT NULL,
  contact_reference TEXT NULL,
  deleted_at        TIMESTAMPTZ NULL
);

CREATE INDEX idx_host_org_site
  ON host (organisation_id, site_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- visitors.ts
-- One-time visitors: this row is optional per Section 11.3's essential data
-- rules — a visit may reference a null visitor_id instead.
-- ============================================================================

CREATE TABLE visitor (
  id                       UUID PRIMARY KEY,
  organisation_id          UUID NOT NULL REFERENCES organisation (id),
  phone_encrypted          TEXT NULL,
  phone_hash               TEXT NULL,
  name                     TEXT NULL,
  preferred_language_code  UUID NULL REFERENCES type_definition (id),
  deleted_at               TIMESTAMPTZ NULL
);

CREATE INDEX idx_visitor_org
  ON visitor (organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_visitor_phone_hash
  ON visitor (organisation_id, phone_hash) WHERE deleted_at IS NULL;

-- ============================================================================
-- invitations.ts
-- Release 1.5 pre-registration (Part Three §3.3, §6.1), P0 in the Vizito gap
-- assessment. Matched to a visit at check-in via invitation_code — never a
-- public name search, per Part Three §2's privacy-safe returning-visitor rule.
-- ============================================================================

CREATE TABLE visit_invitation (
  id                UUID PRIMARY KEY,  -- client-generated
  organisation_id   UUID NOT NULL REFERENCES organisation (id),
  site_id           UUID NOT NULL REFERENCES site (id),
  host_id           UUID NOT NULL REFERENCES host (id),
  visitor_reference TEXT NOT NULL,
  invitation_code   TEXT NOT NULL,
  expected_at       TIMESTAMPTZ NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  status_code       UUID NOT NULL REFERENCES type_definition (id),
  deleted_at        TIMESTAMPTZ NULL
);

CREATE INDEX idx_visit_invitation_org_site
  ON visit_invitation (organisation_id, site_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_visit_invitation_code
  ON visit_invitation (organisation_id, invitation_code) WHERE deleted_at IS NULL;

CREATE TABLE visit_invitation_status_log (  -- immutable
  id             UUID PRIMARY KEY,
  invitation_id  UUID NOT NULL REFERENCES visit_invitation (id),
  status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       UUID NULL,
  reason         TEXT NULL
);

CREATE INDEX idx_visit_invitation_status_log_invitation
  ON visit_invitation_status_log (invitation_id, occurred_at DESC);

-- ============================================================================
-- consent.ts
-- Section 5.2's agreement/acknowledgement evidence field list.
-- ============================================================================

CREATE TABLE consent_agreement (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  site_id          UUID NULL REFERENCES site (id),
  version          INT NOT NULL,
  language_code    UUID NOT NULL REFERENCES type_definition (id),
  content_hash     TEXT NOT NULL,
  published_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_consent_agreement_org_site
  ON consent_agreement (organisation_id, site_id) WHERE deleted_at IS NULL;

-- Append-only by construction (an acknowledgement is never edited) — rule 4
-- exception. site_id and visitor reference are reachable via visit_id.
CREATE TABLE consent_acknowledgement (
  id                     UUID PRIMARY KEY,
  organisation_id        UUID NOT NULL REFERENCES organisation (id),
  visit_id               UUID NOT NULL,  -- FK added after visit table exists, see below
  agreement_id           UUID NOT NULL REFERENCES consent_agreement (id),
  language_shown_code    UUID NOT NULL REFERENCES type_definition (id),
  displayed_at           TIMESTAMPTZ NOT NULL,
  accepted_at            TIMESTAMPTZ NULL,
  capture_method_code    UUID NOT NULL REFERENCES type_definition (id),
  signature_reference    TEXT NULL,
  device_id              UUID NULL REFERENCES device (id),
  deleted_at             TIMESTAMPTZ NULL
);

CREATE INDEX idx_consent_acknowledgement_org_visit
  ON consent_acknowledgement (organisation_id, visit_id);

-- ============================================================================
-- visits.ts
-- ============================================================================

CREATE TABLE visit (
  id                       UUID PRIMARY KEY,  -- client-generated, idempotent offline sync
  organisation_id          UUID NOT NULL REFERENCES organisation (id),
  site_id                  UUID NOT NULL REFERENCES site (id),
  zone_id                  UUID NULL REFERENCES zone (id),
  visitor_id               UUID NULL REFERENCES visitor (id),
  host_id                  UUID NOT NULL REFERENCES host (id),
  visitor_type_code        UUID NOT NULL REFERENCES type_definition (id),
  invitation_id            UUID NULL REFERENCES visit_invitation (id),
  purpose_category_code    UUID NULL REFERENCES type_definition (id),
  capture_channel_code     UUID NOT NULL REFERENCES type_definition (id),
  status_code              UUID NOT NULL REFERENCES type_definition (id),  -- denormalized current status
  photo_reference          TEXT NULL,   -- disabled by default; enforced by access_policy.config, not schema
  notes                    TEXT NULL,   -- restricted; same enforcement point
  checked_in_at            TIMESTAMPTZ NOT NULL,
  server_accepted_at       TIMESTAMPTZ NULL,
  checked_out_at           TIMESTAMPTZ NULL,
  offline_captured         BOOLEAN NOT NULL DEFAULT FALSE,
  retention_policy_version INT NOT NULL,
  deleted_at               TIMESTAMPTZ NULL
);

CREATE INDEX idx_visit_org_site
  ON visit (organisation_id, site_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_visit_org_open
  ON visit (organisation_id, site_id) WHERE deleted_at IS NULL AND checked_out_at IS NULL;
CREATE INDEX idx_visit_org_visitor
  ON visit (organisation_id, visitor_id) WHERE deleted_at IS NULL;

ALTER TABLE consent_acknowledgement
  ADD CONSTRAINT fk_consent_acknowledgement_visit FOREIGN KEY (visit_id) REFERENCES visit (id);

CREATE TABLE visit_status_log (  -- immutable
  id           UUID PRIMARY KEY,
  visit_id     UUID NOT NULL REFERENCES visit (id),
  status_code  UUID NOT NULL REFERENCES type_definition (id),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID NULL,
  reason       TEXT NULL
);

CREATE INDEX idx_visit_status_log_visit
  ON visit_status_log (visit_id, occurred_at DESC);

-- ============================================================================
-- identity-verification.ts
-- Stores only the verification outcome/reference (Section 8.4's critical
-- rule), never the full credential payload. Append-only by construction —
-- no separate _status_log needed, rule 4 exception.
-- ============================================================================

CREATE TABLE identity_verification_event (
  id                      UUID PRIMARY KEY,
  organisation_id         UUID NOT NULL REFERENCES organisation (id),
  visit_id                UUID NOT NULL REFERENCES visit (id),
  provider_code           UUID NOT NULL REFERENCES type_definition (id),
  assurance_level_code    UUID NOT NULL REFERENCES type_definition (id),  -- V0..V4
  outcome_reference       TEXT NULL,
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ NULL
);

CREATE INDEX idx_identity_verification_event_org_visit
  ON identity_verification_event (organisation_id, visit_id);

-- ============================================================================
-- credentials.ts
-- token_reference is a random/cryptographic reference per Section 12.2 —
-- never a static NFC UID alone.
-- ============================================================================

CREATE TABLE credential (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisation (id),
  holder_type_code      UUID NOT NULL REFERENCES type_definition (id),  -- visitor|contractor|staff
  holder_id             UUID NOT NULL,
  credential_type_code  UUID NOT NULL REFERENCES type_definition (id),
  token_reference       TEXT NOT NULL,
  expires_at            TIMESTAMPTZ NULL,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX idx_credential_org
  ON credential (organisation_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_credential_token
  ON credential (organisation_id, token_reference) WHERE deleted_at IS NULL;

CREATE TABLE credential_status_log (  -- immutable
  id             UUID PRIMARY KEY,
  credential_id  UUID NOT NULL REFERENCES credential (id),
  status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       UUID NULL,
  reason         TEXT NULL
);

CREATE INDEX idx_credential_status_log_credential
  ON credential_status_log (credential_id, occurred_at DESC);

-- ============================================================================
-- notifications.ts
-- Append-only by construction (one row per notification attempt) — rule 4
-- exception.
-- ============================================================================

CREATE TABLE notification_event (
  id                      UUID PRIMARY KEY,
  organisation_id         UUID NOT NULL REFERENCES organisation (id),
  visit_id                UUID NOT NULL REFERENCES visit (id),
  channel_code            UUID NOT NULL REFERENCES type_definition (id),
  recipient_reference     TEXT NOT NULL,
  sent_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status_code    UUID NULL REFERENCES type_definition (id),
  deleted_at              TIMESTAMPTZ NULL
);

CREATE INDEX idx_notification_event_org_visit
  ON notification_event (organisation_id, visit_id);

-- ============================================================================
-- emergency.ts
-- Snapshot table is append-only by construction — rule 4 exception.
-- ============================================================================

CREATE TABLE emergency_event (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  site_id          UUID NOT NULL REFERENCES site (id),
  initiated_by     UUID NOT NULL,
  initiated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at        TIMESTAMPTZ NULL,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_emergency_event_org_site
  ON emergency_event (organisation_id, site_id) WHERE deleted_at IS NULL;

CREATE TABLE emergency_roster_snapshot (  -- immutable
  id                   UUID PRIMARY KEY,
  emergency_event_id   UUID NOT NULL REFERENCES emergency_event (id),
  visit_id             UUID NOT NULL REFERENCES visit (id),
  captured_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_roster_snapshot_event
  ON emergency_roster_snapshot (emergency_event_id);

-- ============================================================================
-- dsar.ts
-- ============================================================================

CREATE TABLE data_subject_request (
  id                 UUID PRIMARY KEY,
  organisation_id    UUID NOT NULL REFERENCES organisation (id),
  subject_reference  TEXT NOT NULL,
  request_type_code  UUID NOT NULL REFERENCES type_definition (id),
  status_code        UUID NOT NULL REFERENCES type_definition (id),
  deleted_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_data_subject_request_org
  ON data_subject_request (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE dsar_status_log (  -- immutable
  id           UUID PRIMARY KEY,
  request_id   UUID NOT NULL REFERENCES data_subject_request (id),
  status_code  UUID NOT NULL REFERENCES type_definition (id),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     UUID NULL,
  reason       TEXT NULL
);

CREATE INDEX idx_dsar_status_log_request
  ON dsar_status_log (request_id, occurred_at DESC);

-- ============================================================================
-- legal-holds.ts
-- ============================================================================

CREATE TABLE legal_hold (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  scope            JSONB NOT NULL DEFAULT '{}'::jsonb,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_legal_hold_org
  ON legal_hold (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE legal_hold_status_log (  -- immutable
  id             UUID PRIMARY KEY,
  legal_hold_id  UUID NOT NULL REFERENCES legal_hold (id),
  status_code    UUID NOT NULL REFERENCES type_definition (id),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id       UUID NULL,
  reason         TEXT NULL
);

CREATE INDEX idx_legal_hold_status_log_hold
  ON legal_hold_status_log (legal_hold_id, occurred_at DESC);

-- ============================================================================
-- rbac.ts
-- ============================================================================

CREATE TABLE role (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  role_code        UUID NOT NULL REFERENCES type_definition (id),  -- includes 'owner_operator', Section 9.1a
  is_bundle        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_role_org
  ON role (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE user_account (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisation (id),
  email                 TEXT NOT NULL,
  mfa_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret_reference  TEXT NULL,  -- points at a secrets-manager entry, never a raw secret
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_user_account_org_email
  ON user_account (organisation_id, email) WHERE deleted_at IS NULL;

-- Buffr Checkpoint's own Platform Support role (Section 9.1), never
-- customer-side: Section 9.2 rule 4's "exceptional, time-bound,
-- client-approved where practical, reason-coded, fully logged" break-glass
-- access.
CREATE TABLE support_access_grant (
  id                  UUID PRIMARY KEY,
  organisation_id     UUID NOT NULL REFERENCES organisation (id),
  granted_to_user_id  UUID NOT NULL,
  reason_code         UUID NOT NULL REFERENCES type_definition (id),
  approved_by         UUID NOT NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ NULL,
  deleted_at          TIMESTAMPTZ NULL
);

CREATE INDEX idx_support_access_grant_org
  ON support_access_grant (organisation_id) WHERE deleted_at IS NULL;

-- assignment_event_type_code distinguishes Section 9.2 rule 7's "initial
-- assignment" (logged only) from "role change" (requires approval + audit).
CREATE TABLE role_assignment (
  id                          UUID PRIMARY KEY,
  organisation_id             UUID NOT NULL REFERENCES organisation (id),
  site_id                     UUID NULL REFERENCES site (id),
  user_id                     UUID NOT NULL REFERENCES user_account (id),
  role_id                     UUID NOT NULL REFERENCES role (id),
  assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  assignment_event_type_code  UUID NOT NULL REFERENCES type_definition (id),  -- initial|change
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_role_assignment_org_user
  ON role_assignment (organisation_id, user_id) WHERE deleted_at IS NULL;

-- Immutable; only written when assignment_event_type_code = 'change'.
CREATE TABLE role_assignment_status_log (
  id                  UUID PRIMARY KEY,
  role_assignment_id  UUID NOT NULL REFERENCES role_assignment (id),
  event_type_code     UUID NOT NULL REFERENCES type_definition (id),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id            UUID NULL,
  approved_by         UUID NULL,
  reason              TEXT NULL
);

CREATE INDEX idx_role_assignment_status_log_assignment
  ON role_assignment_status_log (role_assignment_id, occurred_at DESC);

-- ============================================================================
-- evidence.ts
-- Generation is stateful (pending -> generating -> ready|failed), unlike the
-- append-only tables above.
-- ============================================================================

CREATE TABLE evidence_pack (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  requested_by     UUID NOT NULL,
  scope            JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_code      UUID NOT NULL REFERENCES type_definition (id),
  generated_at     TIMESTAMPTZ NULL,
  file_reference   TEXT NULL,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_evidence_pack_org
  ON evidence_pack (organisation_id) WHERE deleted_at IS NULL;

CREATE TABLE evidence_pack_status_log (  -- immutable
  id                UUID PRIMARY KEY,
  evidence_pack_id  UUID NOT NULL REFERENCES evidence_pack (id),
  status_code       UUID NOT NULL REFERENCES type_definition (id),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id          UUID NULL,
  reason            TEXT NULL
);

CREATE INDEX idx_evidence_pack_status_log_pack
  ON evidence_pack_status_log (evidence_pack_id, occurred_at DESC);

-- ============================================================================
-- audit.ts
-- Append-only, hash-linked chain per Section 11.2. No separate _status_log —
-- rule 4 exception, this table IS the log.
-- ============================================================================

CREATE TABLE audit_event (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisation (id),
  actor_id         UUID NULL,
  action           TEXT NOT NULL,
  resource_type    TEXT NOT NULL,
  resource_id      UUID NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  prev_event_hash  TEXT NULL,
  event_hash       TEXT NOT NULL
);

CREATE INDEX idx_audit_event_org_occurred
  ON audit_event (organisation_id, occurred_at DESC);
