-- Buffr Checkpoint — Capability Status v0.4 correction
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md Section 4a.7, v0.4 hardening-pass
-- point 1. The single `capability_status` table conflated Buffr
-- Checkpoint's own platform-wide integration status with whether any given
-- tenant has actually enabled a capability, and exposed no controlled
-- public-display field distinct from the internal status. This migration
-- replaces it with two tables.
-- STATUS: Approved for implementation, 2026-09-09 (owner: George Nekwaya)

DROP TABLE IF EXISTS capability_status;

-- Buffr-Checkpoint-wide: is Buffr Checkpoint's own adapter/capability
-- approved and working at all, regardless of any customer. No
-- organisation_id — a deliberate Wiebe rule 8 tenancy exception, same as
-- the table it replaces.
CREATE TABLE platform_capability_status (
  id                     UUID PRIMARY KEY,
  capability_code        UUID NOT NULL REFERENCES type_definition (id),  -- domain 'capability_code'
  status_code            UUID NOT NULL REFERENCES type_definition (id),  -- domain 'capability_status_value'
  evidence_reference     TEXT NULL,        -- internal only: never exposed publicly
  confirmed_by           UUID NULL,        -- platform_support role only
  confirmed_at           TIMESTAMPTZ NULL,
  public_display_status  UUID NOT NULL REFERENCES type_definition (id), -- domain 'public_capability_status_value'
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_platform_capability_status_code
  ON platform_capability_status (capability_code);

-- Per tenant: has THIS organisation actually enabled a capability that is
-- platform-capable. platform-capable != client-approved != site-permitted.
CREATE TABLE organisation_capability_enablement (
  id                       UUID PRIMARY KEY,
  organisation_id          UUID NOT NULL REFERENCES organisation (id),
  capability_code          UUID NOT NULL REFERENCES type_definition (id), -- domain 'capability_code'
  status_code              UUID NOT NULL REFERENCES type_definition (id), -- domain 'capability_status_value'
  enabled_at               TIMESTAMPTZ NULL,
  enabled_by               UUID NULL,       -- tenant System Administrator or Compliance/Audit Officer
  configuration_reference  TEXT NULL,       -- e.g. which sites/zones, which adapter config
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_org_capability_enablement_org_capability
  ON organisation_capability_enablement (organisation_id, capability_code);
CREATE INDEX idx_org_capability_enablement_org
  ON organisation_capability_enablement (organisation_id);
