-- Buffr Checkpoint — Capability Status Register
-- Source of truth: buffrcheckpoint.md Section 4a.7 ("The targeted month has
-- arrived — from a hardcoded date to a governed status"). This table was
-- specified there but never actually created — closing that gap now that
-- the public website needs to read real status, not a hardcoded string.
-- STATUS: Approved for Release 1 implementation, 2026-09-09 (owner: George Nekwaya)

-- No organisation_id: this is Buffr Checkpoint's own platform-wide
-- integration status (DigiNam, national e-ID), not a per-customer setting —
-- a deliberate Wiebe rule 8 tenancy exception, not an oversight.
CREATE TABLE capability_status (
  id                 UUID PRIMARY KEY,
  capability_code    UUID NOT NULL REFERENCES type_definition (id),  -- domain 'capability_code'
  status_code        UUID NOT NULL REFERENCES type_definition (id),  -- domain 'capability_status_value'
  evidence_reference TEXT NULL,
  confirmed_by       UUID NULL,
  confirmed_at       TIMESTAMPTZ NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_capability_status_code
  ON capability_status (capability_code);
