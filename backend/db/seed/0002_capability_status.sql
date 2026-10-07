-- Buffr Checkpoint — Capability Status v0.4 seed data
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md Section 4a.7, v0.4 hardening-pass point 1.
-- Applied directly via MCP on 2026-09-09 (Oregon); carried into falling-frog-15538162 by the 2026-09-25 Frankfurt move.

INSERT INTO type_definition (id, domain, code, label, sort_order) VALUES
  (gen_random_uuid(), 'capability_code', 'nfc_badge_checkin', 'NFC Badge/Token Check-In', 3);

INSERT INTO type_definition (id, domain, code, label, sort_order) VALUES
  (gen_random_uuid(), 'capability_status_value', 'discovery', 'Discovery', 4),
  (gen_random_uuid(), 'capability_status_value', 'approved', 'Approved', 5),
  (gen_random_uuid(), 'capability_status_value', 'pilot', 'Pilot', 6),
  (gen_random_uuid(), 'capability_status_value', 'suspended', 'Suspended', 7),
  (gen_random_uuid(), 'capability_status_value', 'not_started', 'Not started', 8),
  (gen_random_uuid(), 'capability_status_value', 'partner_testing', 'Partner testing', 9);

-- Public-facing vocabulary only — deliberately narrower than the internal
-- capability_status_value domain above. Internal states (discovery,
-- approved, pilot, not_started, partner_testing, suspended) all collapse to
-- 'not_available' when read through public_display_status; only 'targeted'
-- and 'live' pass through distinctly. This is enforced by which value is
-- written to platform_capability_status.public_display_status, not by a
-- runtime mapping the API applies on read — the public column is the
-- single source of truth the public API and website are allowed to read.
INSERT INTO type_definition (id, domain, code, label, sort_order) VALUES
  (gen_random_uuid(), 'public_capability_status_value', 'not_available', 'Not available', 1),
  (gen_random_uuid(), 'public_capability_status_value', 'targeted', 'Targeted', 2),
  (gen_random_uuid(), 'public_capability_status_value', 'live', 'Live', 3);

INSERT INTO platform_capability_status (id, capability_code, status_code, public_display_status, updated_at)
SELECT
  gen_random_uuid(),
  cc.id,
  sv.id,
  pv.id,
  now()
FROM (VALUES
  ('diginam_verification', 'discovery', 'not_available'),
  ('national_eid_nfc', 'targeted', 'targeted'),
  ('nfc_badge_checkin', 'live', 'live')
) AS seed(capability_code, status_value, public_value)
JOIN type_definition cc ON cc.domain = 'capability_code' AND cc.code = seed.capability_code
JOIN type_definition sv ON sv.domain = 'capability_status_value' AND sv.code = seed.status_value
JOIN type_definition pv ON pv.domain = 'public_capability_status_value' AND pv.code = seed.public_value;
