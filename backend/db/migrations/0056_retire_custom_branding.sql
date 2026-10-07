-- 0056: retire custom branding (logo, brand colour, welcome message, display names, background) -- owner decision 2026-10-06.
-- DESTRUCTIVE and forward-only. Apply AFTER the API that no longer reads these tables is deployed, never before: the previous API
-- version writes visitor_visits.branding_profile_version_id and queries the branding tables.
-- Rollback is a Neon point-in-time restore or the branch taken before applying; the data being dropped is demo branding only.
--
-- What stays: privacy notices (visitor_policy_*), capture channels and kiosk experience configuration. The kiosk now takes its privacy
-- notice from the organisation's published `privacy_notice` policy instead of from a branding version.

-- 1. Onboarding: the "branding" step no longer exists. Move any organisation positioned on it to its first unfinished step,
--    and drop the code from the completed and skipped lists so the progress arrays only hold current steps.
WITH ordered(step_code, position) AS (
  VALUES ('organisation_profile', 1), ('site_hierarchy', 2), ('hosts_departments', 3), ('launch_route', 4),
         ('notices_retention', 5), ('visitor_categories', 6), ('check_in_channels', 7), ('flow_tests', 8), ('role_training', 9)
),
targets AS (
  SELECT s.id,
         COALESCE(
           (SELECT o.step_code FROM ordered o
            WHERE NOT (s.completed_step_codes ? o.step_code)
            ORDER BY o.position LIMIT 1),
           'golive_approval') AS next_step
  FROM organisation_onboarding_states s
  JOIN type_definition cur ON cur.id = s.current_step_code AND cur.domain = 'onboarding_step_code' AND cur.code = 'branding'
  WHERE s.deleted_at IS NULL
)
UPDATE organisation_onboarding_states s
SET current_step_code = (
  SELECT t.id FROM type_definition t
  WHERE t.domain = 'onboarding_step_code' AND t.code = targets.next_step AND t.deleted_at IS NULL
)
FROM targets
WHERE s.id = targets.id;

UPDATE organisation_onboarding_states
SET completed_step_codes = completed_step_codes - 'branding',
    skipped_step_codes = skipped_step_codes - 'branding'
WHERE completed_step_codes ? 'branding' OR skipped_step_codes ? 'branding';

-- The config row is retired, not deleted: past status-log rows may point at it.
UPDATE type_definition SET deleted_at = NOW()
WHERE domain = 'onboarding_step_code' AND code = 'branding' AND deleted_at IS NULL;

-- 2. References to branding versions.
ALTER TABLE visitor_visits DROP COLUMN IF EXISTS branding_profile_version_id;
ALTER TABLE kiosk_experience_configuration_versions DROP COLUMN IF EXISTS branding_profile_version_id;

-- 3. The branding tables themselves (children first).
DROP TABLE IF EXISTS site_branding_profile_version_channels;
DROP TABLE IF EXISTS site_branding_profile_version_languages;
DROP TABLE IF EXISTS site_branding_profile_versions;
DROP TABLE IF EXISTS site_branding_profiles;
