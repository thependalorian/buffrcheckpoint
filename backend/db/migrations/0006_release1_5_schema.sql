-- Buffr Checkpoint — Section 11.4.5a schema proposals, applied
-- Source of truth: buffrcheckpoint.md Section 11.4.5a
-- STATUS: Approved for implementation, 2026-09-09 (owner: George Nekwaya)
--
-- Closes: PII encryption for visitor.name and host.contact_reference
-- (mirrors the existing phone_encrypted/phone_hash pattern), an
-- idempotency_key on visit for the offline-sync retry path, a
-- legal_basis_code distinction on consent_acknowledgement (mandatory
-- notice vs. revocable consent), the form-templates/workflow-policy table
-- family (Part Three §3.3/§5's dynamic form/workflow configuration, no
-- prior schema home), and the legal_hold.active -> status-log-derived
-- behavioral correction.
--
-- organisation_capability_enablement (also listed in Section 11.4.5a) is
-- NOT part of this migration — it already exists, added in
-- 0005_capability_status_split.sql.

-- ============================================================================
-- visitors.ts — encrypt the one remaining plaintext PII column
-- ============================================================================

ALTER TABLE visitor ADD COLUMN name_encrypted TEXT NULL;
ALTER TABLE visitor ADD COLUMN name_hash TEXT NULL;
UPDATE visitor SET name_encrypted = name WHERE name IS NOT NULL;
ALTER TABLE visitor DROP COLUMN name;

-- ============================================================================
-- hosts.ts — same pattern for contact_reference
-- ============================================================================

ALTER TABLE host ADD COLUMN contact_reference_encrypted TEXT NULL;
ALTER TABLE host ADD COLUMN contact_reference_hash TEXT NULL;
UPDATE host SET contact_reference_encrypted = contact_reference WHERE contact_reference IS NOT NULL;
ALTER TABLE host DROP COLUMN contact_reference;

-- ============================================================================
-- visits.ts — idempotency_key for the offline-sync retry path
-- ============================================================================

ALTER TABLE visit ADD COLUMN idempotency_key TEXT NULL;
CREATE UNIQUE INDEX idx_visit_org_idempotency_key
  ON visit (organisation_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- consent.ts — legal_basis_code ('mandatory_notice' vs 'optional_consent')
-- ============================================================================

ALTER TABLE consent_acknowledgement ADD COLUMN legal_basis_code UUID NULL REFERENCES type_definition (id);
-- Backfill existing rows (none expected pre-Release-1-launch) to the
-- conservative default before enforcing NOT NULL going forward.
UPDATE consent_acknowledgement SET legal_basis_code = (
  SELECT id FROM type_definition WHERE domain = 'legal_basis_code' AND code = 'mandatory_notice'
) WHERE legal_basis_code IS NULL;
ALTER TABLE consent_acknowledgement ALTER COLUMN legal_basis_code SET NOT NULL;

-- ============================================================================
-- legal-holds.ts — active is now derived from legal_hold_status_log,
-- matching every other _status_log table (Section 11.4.5a behavioral fix)
-- ============================================================================

ALTER TABLE legal_hold DROP COLUMN active;

-- ============================================================================
-- form-templates.ts — dynamic form/workflow configuration
-- ============================================================================

CREATE TABLE form_template (
  id                 UUID PRIMARY KEY,
  organisation_id    UUID NOT NULL REFERENCES organisation (id),
  visitor_type_code  UUID NOT NULL REFERENCES type_definition (id),
  site_id            UUID NULL REFERENCES site (id),
  deleted_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_form_template_org ON form_template (organisation_id) WHERE deleted_at IS NULL;

-- Immutable once published — a correction is a new version row.
CREATE TABLE form_template_version (
  id                 UUID PRIMARY KEY,
  form_template_id   UUID NOT NULL REFERENCES form_template (id),
  version            INT NOT NULL,
  published_at       TIMESTAMPTZ NULL,
  deleted_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_form_template_version_template ON form_template_version (form_template_id);
CREATE UNIQUE INDEX idx_form_template_version_template_version
  ON form_template_version (form_template_id, version);

CREATE TABLE form_field_definition (
  id                          UUID PRIMARY KEY,
  form_template_version_id   UUID NOT NULL REFERENCES form_template_version (id),
  field_class_code            UUID NOT NULL REFERENCES type_definition (id),
  field_key                   TEXT NOT NULL,
  required                    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_form_field_definition_version ON form_field_definition (form_template_version_id);

CREATE TABLE form_field_rule (
  id                        UUID PRIMARY KEY,
  form_field_definition_id  UUID NOT NULL REFERENCES form_field_definition (id),
  rule_type_code            UUID NOT NULL REFERENCES type_definition (id),
  rule_config               JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at                TIMESTAMPTZ NULL
);

CREATE INDEX idx_form_field_rule_field ON form_field_rule (form_field_definition_id);

CREATE TABLE visitor_type_policy (
  id                            UUID PRIMARY KEY,
  organisation_id               UUID NOT NULL REFERENCES organisation (id),
  visitor_type_code             UUID NOT NULL REFERENCES type_definition (id),
  form_template_id              UUID NOT NULL REFERENCES form_template (id),
  default_assurance_level_code  UUID NOT NULL REFERENCES type_definition (id),
  deleted_at                    TIMESTAMPTZ NULL
);

CREATE INDEX idx_visitor_type_policy_org ON visitor_type_policy (organisation_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_visitor_type_policy_org_type
  ON visitor_type_policy (organisation_id, visitor_type_code) WHERE deleted_at IS NULL;

CREATE TABLE workflow_policy (
  id                 UUID PRIMARY KEY,
  organisation_id    UUID NOT NULL REFERENCES organisation (id),
  site_id            UUID NULL REFERENCES site (id),
  zone_id            UUID NULL REFERENCES zone (id),
  deleted_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_workflow_policy_org ON workflow_policy (organisation_id) WHERE deleted_at IS NULL;

-- Immutable versions, same pattern as form_template_version.
CREATE TABLE workflow_policy_version (
  id                   UUID PRIMARY KEY,
  workflow_policy_id   UUID NOT NULL REFERENCES workflow_policy (id),
  version              INT NOT NULL,
  config               JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at         TIMESTAMPTZ NULL,
  deleted_at           TIMESTAMPTZ NULL
);

CREATE INDEX idx_workflow_policy_version_policy ON workflow_policy_version (workflow_policy_id);
CREATE UNIQUE INDEX idx_workflow_policy_version_policy_version
  ON workflow_policy_version (workflow_policy_id, version);

-- Replaces relying on access_policy.config jsonb alone to answer "which
-- channels are available at this site."
CREATE TABLE site_capture_channel_policy (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisation (id),
  site_id               UUID NOT NULL REFERENCES site (id),
  capture_channel_code  UUID NOT NULL REFERENCES type_definition (id),
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_capture_channel_policy_org_site
  ON site_capture_channel_policy (organisation_id, site_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_site_capture_channel_policy_site_channel
  ON site_capture_channel_policy (site_id, capture_channel_code) WHERE deleted_at IS NULL;
