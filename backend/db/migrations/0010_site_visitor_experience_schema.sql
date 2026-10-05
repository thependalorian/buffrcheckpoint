-- Buffr Checkpoint — Section 11.9.8 site visitor experience schema
-- Source of truth: buffrcheckpoint.md Section 11.9.8 (v0.11)
-- STATUS: Applied 2026-09-11; live on Neon falling-frog-15538162
--
-- Adds: site branding profiles + versions, kiosk experience configurations +
-- versions, typed site QR references + rotation log, host-notification
-- escalation policies + versions, and visit-row snapshot FKs for audit
-- evidence ("what did the visitor actually see on check-in day?").
--
-- Wiebe rules honoured: UUID PKs, organisation_id tenancy, soft deletes on
-- operational spines, append-only rotation log, type_definition FKs (no
-- CHECK enums), zero triggers, zero ON DELETE CASCADE.

-- ============================================================================
-- site_branding_profiles + versions (Section 11.9.8.2)
-- ============================================================================

CREATE TABLE site_branding_profiles (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  region_id        UUID NULL REFERENCES regions (id),
  site_id          UUID NULL REFERENCES sites (id),
  profile_name     TEXT NULL,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_branding_profiles_org
  ON site_branding_profiles (organisation_id, site_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_site_branding_profiles_org_site
  ON site_branding_profiles (organisation_id, site_id)
  WHERE deleted_at IS NULL AND site_id IS NOT NULL;

CREATE UNIQUE INDEX idx_site_branding_profiles_org_default
  ON site_branding_profiles (organisation_id)
  WHERE deleted_at IS NULL AND site_id IS NULL AND region_id IS NULL;

CREATE TABLE site_branding_profile_versions (
  id                          UUID PRIMARY KEY,
  branding_profile_id         UUID NOT NULL REFERENCES site_branding_profiles (id),
  version_number              INT NOT NULL,
  logo_artifact_id            TEXT NULL,
  brand_colour_token          TEXT NULL,
  welcome_message             TEXT NULL,
  background_artifact_id      TEXT NULL,
  organisation_display_name   TEXT NULL,
  site_display_name           TEXT NULL,
  help_contact_reference      TEXT NULL,
  privacy_notice_version_id   UUID NULL REFERENCES visitor_policy_versions (id),
  effective_from              TIMESTAMPTZ NULL,
  effective_until             TIMESTAMPTZ NULL,
  approved_by                 UUID NULL,
  published_at                TIMESTAMPTZ NULL,
  status_code                 UUID NULL REFERENCES type_definition (id),
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_branding_profile_versions_profile
  ON site_branding_profile_versions (branding_profile_id);

CREATE UNIQUE INDEX idx_site_branding_profile_versions_profile_version
  ON site_branding_profile_versions (branding_profile_id, version_number);

CREATE TABLE site_branding_profile_version_languages (
  id                          UUID PRIMARY KEY,
  branding_profile_version_id UUID NOT NULL REFERENCES site_branding_profile_versions (id),
  language_code               UUID NOT NULL REFERENCES type_definition (id),
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_branding_profile_version_languages_version
  ON site_branding_profile_version_languages (branding_profile_version_id);

CREATE UNIQUE INDEX idx_site_branding_profile_version_languages_unique
  ON site_branding_profile_version_languages (branding_profile_version_id, language_code);

CREATE TABLE site_branding_profile_version_channels (
  id                          UUID PRIMARY KEY,
  branding_profile_version_id UUID NOT NULL REFERENCES site_branding_profile_versions (id),
  capture_channel_code        UUID NOT NULL REFERENCES type_definition (id),
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_branding_profile_version_channels_version
  ON site_branding_profile_version_channels (branding_profile_version_id);

CREATE UNIQUE INDEX idx_site_branding_profile_version_channels_unique
  ON site_branding_profile_version_channels (branding_profile_version_id, capture_channel_code);

-- ============================================================================
-- kiosk_experience_configurations + versions (11.9.8.2 / 11.9.8.3 / 11.9.8.5)
-- ============================================================================

CREATE TABLE kiosk_experience_configurations (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  site_id          UUID NOT NULL REFERENCES sites (id),
  device_id        UUID NULL REFERENCES managed_kiosk_devices (id),
  config_name      TEXT NULL,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_kiosk_experience_configurations_org_site
  ON kiosk_experience_configurations (organisation_id, site_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_kiosk_experience_configurations_org_site_device
  ON kiosk_experience_configurations (organisation_id, site_id, device_id)
  WHERE deleted_at IS NULL AND device_id IS NOT NULL;

CREATE UNIQUE INDEX idx_kiosk_experience_configurations_org_site_default
  ON kiosk_experience_configurations (organisation_id, site_id)
  WHERE deleted_at IS NULL AND device_id IS NULL;

CREATE TABLE kiosk_experience_configuration_versions (
  id                                UUID PRIMARY KEY,
  kiosk_experience_configuration_id UUID NOT NULL REFERENCES kiosk_experience_configurations (id),
  branding_profile_version_id       UUID NULL REFERENCES site_branding_profile_versions (id),
  version_number                    INT NOT NULL,
  idle_timeout_seconds              INT NOT NULL DEFAULT 120,
  idle_warning_seconds              INT NOT NULL DEFAULT 30,
  maintenance_mode_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message               TEXT NULL,
  assisted_entry_direction          TEXT NULL,
  accessibility_large_text_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from                    TIMESTAMPTZ NULL,
  effective_until                   TIMESTAMPTZ NULL,
  approved_by                       UUID NULL,
  published_at                      TIMESTAMPTZ NULL,
  status_code                       UUID NULL REFERENCES type_definition (id),
  deleted_at                        TIMESTAMPTZ NULL
);

CREATE INDEX idx_kiosk_experience_configuration_versions_config
  ON kiosk_experience_configuration_versions (kiosk_experience_configuration_id);

CREATE UNIQUE INDEX idx_kiosk_experience_configuration_versions_config_version
  ON kiosk_experience_configuration_versions (kiosk_experience_configuration_id, version_number);

CREATE TABLE kiosk_experience_configuration_version_channels (
  id                                      UUID PRIMARY KEY,
  kiosk_experience_configuration_version_id UUID NOT NULL REFERENCES kiosk_experience_configuration_versions (id),
  capture_channel_code                    UUID NOT NULL REFERENCES type_definition (id),
  deleted_at                              TIMESTAMPTZ NULL
);

CREATE INDEX idx_kiosk_experience_configuration_version_channels_version
  ON kiosk_experience_configuration_version_channels (kiosk_experience_configuration_version_id);

CREATE UNIQUE INDEX idx_kiosk_experience_configuration_version_channels_unique
  ON kiosk_experience_configuration_version_channels (
    kiosk_experience_configuration_version_id,
    capture_channel_code
  );

-- ============================================================================
-- site_qr_references + append-only rotations (Section 11.9.8.1)
-- ============================================================================

CREATE TABLE site_qr_references (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  site_id          UUID NOT NULL REFERENCES sites (id),
  qr_type_code     UUID NOT NULL REFERENCES type_definition (id),
  label            TEXT NULL,
  deleted_at       TIMESTAMPTZ NULL
);

CREATE INDEX idx_site_qr_references_org_site
  ON site_qr_references (organisation_id, site_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_site_qr_references_org_site_type
  ON site_qr_references (organisation_id, site_id, qr_type_code)
  WHERE deleted_at IS NULL;

CREATE TABLE site_qr_reference_rotations (
  id                   UUID PRIMARY KEY,
  organisation_id      UUID NOT NULL REFERENCES organisations (id),
  site_id              UUID NOT NULL REFERENCES sites (id),
  site_qr_reference_id UUID NOT NULL REFERENCES site_qr_references (id),
  opaque_token_hmac    TEXT NOT NULL,
  active_from          TIMESTAMPTZ NOT NULL,
  active_until         TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_site_qr_reference_rotations_org_site_active
  ON site_qr_reference_rotations (organisation_id, site_id, active_until);

CREATE INDEX idx_site_qr_reference_rotations_reference
  ON site_qr_reference_rotations (site_qr_reference_id, active_from);

-- ============================================================================
-- host_notification_escalation_policies + versions (Section 11.9.8.4)
-- ============================================================================

CREATE TABLE host_notification_escalation_policies (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  site_id               UUID NULL REFERENCES sites (id),
  visitor_category_code UUID NULL REFERENCES type_definition (id),
  policy_name           TEXT NULL,
  deleted_at            TIMESTAMPTZ NULL
);

CREATE INDEX idx_host_notification_escalation_policies_org
  ON host_notification_escalation_policies (organisation_id, site_id)
  WHERE deleted_at IS NULL;

CREATE TABLE host_notification_escalation_policy_versions (
  id                          UUID PRIMARY KEY,
  escalation_policy_id        UUID NOT NULL REFERENCES host_notification_escalation_policies (id),
  version_number              INT NOT NULL,
  wait_seconds                INT NOT NULL DEFAULT 300,
  escalation_action_code      UUID NOT NULL REFERENCES type_definition (id),
  alternate_recipient_reference TEXT NULL,
  effective_from              TIMESTAMPTZ NULL,
  effective_until             TIMESTAMPTZ NULL,
  approved_by                 UUID NULL,
  published_at                TIMESTAMPTZ NULL,
  status_code                 UUID NULL REFERENCES type_definition (id),
  deleted_at                  TIMESTAMPTZ NULL
);

CREATE INDEX idx_host_notification_escalation_policy_versions_policy
  ON host_notification_escalation_policy_versions (escalation_policy_id);

CREATE UNIQUE INDEX idx_host_notification_escalation_policy_versions_policy_version
  ON host_notification_escalation_policy_versions (escalation_policy_id, version_number);

-- ============================================================================
-- visitor_visits — experience snapshot FKs for audit evidence
-- ============================================================================

ALTER TABLE visitor_visits
  ADD COLUMN branding_profile_version_id UUID NULL
    REFERENCES site_branding_profile_versions (id);

ALTER TABLE visitor_visits
  ADD COLUMN kiosk_experience_configuration_version_id UUID NULL
    REFERENCES kiosk_experience_configuration_versions (id);

CREATE INDEX idx_visitor_visits_branding_version
  ON visitor_visits (organisation_id, branding_profile_version_id)
  WHERE deleted_at IS NULL AND branding_profile_version_id IS NOT NULL;

CREATE INDEX idx_visitor_visits_kiosk_experience_version
  ON visitor_visits (organisation_id, kiosk_experience_configuration_version_id)
  WHERE deleted_at IS NULL AND kiosk_experience_configuration_version_id IS NOT NULL;
