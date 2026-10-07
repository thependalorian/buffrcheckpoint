-- Buffr Checkpoint — onboarding test arrival (docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md v0.33).
--
-- The Test arrival checklist step creates one real visit through the normal
-- check-in path, tagged with capture channel `onboarding_test`. Analytics,
-- reports, organisation health, platform totals and anomaly rules exclude it
-- (backend/src/modules/visits/test-visit-filter.ts); retention still applies.
-- Config row only, no schema change.

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'capture_channel', 'onboarding_test', 'Onboarding test visit', 90
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'capture_channel' AND code = 'onboarding_test'
);
