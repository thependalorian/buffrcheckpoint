-- Align demo + Buffr Analytics branding with buffr-intelligence DESIGN.md tokens.
-- Source: buffr-intelligence/DESIGN.md (brand-magenta-aa #CF1161), docs/company-profile.md
-- Logo: tenant-scoped asset on the website (not Checkpoint /logo.png).
-- Safe to re-run.

UPDATE site_branding_profile_versions
SET
  organisation_display_name = 'Buffr Analytics',
  welcome_message = 'Welcome to Buffr Analytics',
  site_display_name = COALESCE(site_display_name, 'Demo Front Desk'),
  brand_colour_token = '#CF1161',
  help_contact_reference = 'team@buffranalytics.com',
  logo_artifact_id = '/org-assets/buffr-analytics/icon.png'
WHERE id = 'b1111111-1111-4111-8111-111111111102';

UPDATE site_branding_profile_versions
SET
  organisation_display_name = 'Buffr Analytics',
  welcome_message = 'Welcome to Buffr Analytics',
  brand_colour_token = '#CF1161',
  help_contact_reference = 'team@buffranalytics.com',
  logo_artifact_id = '/org-assets/buffr-analytics/icon.png'
WHERE id = 'f8265bf3-be4a-4f40-b478-5c8ed2b22d31';

UPDATE organisations
SET
  legal_name = 'Buffr Financial Services CC',
  trading_name = 'Buffr Analytics',
  registration_reference = 'CC/2024/09322',
  data_residency_policy = 'Namibia (Africa/Windhoek); primary processing in-region'
WHERE id = 'b51f0704-12a7-45d4-8b0d-3642785b6e77';
