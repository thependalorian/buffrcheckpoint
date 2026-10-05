-- Buffr Checkpoint — launch-readiness checklist (buffrcheckpoint.md v0.33).
--
-- The 13-step wizard asked for branding before a site existed and required
-- kiosk devices from customers launching with phone QR only. The checklist
-- now depends on a chosen launch route (QR-first Core or Kiosk); the
-- requirement matrix lives in backend/src/modules/onboarding/onboarding-steps.ts.
--
--   launch_route_code   type_definition FK, domain onboarding_launch_route.
--   skipped_step_codes  optional steps the customer chose to skip (recorded, not completed).
--   version             optimistic concurrency for checklist writes.
--
-- Existing completed_step_codes stay valid: no step code is renamed or removed.
-- New step code `launch_route` marks the route choice in the checklist order.

ALTER TABLE organisation_onboarding_states
  ADD COLUMN IF NOT EXISTS launch_route_code UUID NULL REFERENCES type_definition (id),
  ADD COLUMN IF NOT EXISTS skipped_step_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('onboarding_launch_route', 'qr_first', 'QR-first (Core)', 1),
  ('onboarding_launch_route', 'kiosk', 'Kiosk', 2),
  ('onboarding_step_code', 'launch_route', 'Choose launch route', 35)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);
