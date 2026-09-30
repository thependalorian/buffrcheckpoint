-- Published site experience for kiosk demo site (§11.7.7)
-- Site: 74c72c99-93dc-4b33-934b-9b365e9924cf ("Demo Front Desk")
-- Org:  b51f0704-12a7-45d4-8b0d-3642785b6e77 (Buffr Analytics)

-- Idempotent: skip if a published branding profile already exists for this site.
DO $$
DECLARE
  v_org UUID := 'b51f0704-12a7-45d4-8b0d-3642785b6e77';
  v_site UUID := '74c72c99-93dc-4b33-934b-9b365e9924cf';
  v_published UUID;
  v_branding_profile UUID := 'b1111111-1111-4111-8111-111111111101';
  v_branding_version UUID := 'b1111111-1111-4111-8111-111111111102';
  v_kiosk_config UUID := 'b2222222-2222-4222-8222-222222222201';
  v_kiosk_version UUID := 'b2222222-2222-4222-8222-222222222202';
  v_qr_ref UUID := 'b3333333-3333-4333-8333-333333333301';
  v_escalation_policy UUID := 'b4444444-4444-4444-8444-444444444401';
  v_escalation_version UUID := 'b4444444-4444-4444-8444-444444444402';
BEGIN
  SELECT id INTO v_published
  FROM type_definition
  WHERE domain = 'configuration_version_status' AND code = 'published';

  IF EXISTS (
    SELECT 1 FROM site_branding_profiles
    WHERE organisation_id = v_org AND site_id = v_site AND deleted_at IS NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO site_branding_profiles (id, organisation_id, site_id, profile_name)
  VALUES (v_branding_profile, v_org, v_site, 'Demo Front Desk branding');

  INSERT INTO site_branding_profile_versions (
    id, branding_profile_id, version_number, logo_artifact_id, brand_colour_token,
    welcome_message, organisation_display_name, site_display_name, help_contact_reference,
    effective_from, published_at, status_code
  ) VALUES (
    v_branding_version, v_branding_profile, 1, '/org-assets/buffr-analytics/icon.png', '#CF1161',
    'Welcome to Buffr Analytics', 'Buffr Analytics', 'Demo Front Desk', 'team@buffranalytics.com',
    NOW(), NOW(), v_published
  );

  INSERT INTO site_branding_profile_version_languages (id, branding_profile_version_id, language_code)
  SELECT gen_random_uuid(), v_branding_version, id
  FROM type_definition WHERE domain = 'language_code' AND code IN ('en', 'af');

  INSERT INTO site_branding_profile_version_channels (id, branding_profile_version_id, capture_channel_code)
  SELECT gen_random_uuid(), v_branding_version, id
  FROM type_definition WHERE domain = 'capture_channel' AND code IN ('kiosk', 'assisted', 'qr', 'nfc_badge', 'ussd');

  INSERT INTO kiosk_experience_configurations (id, organisation_id, site_id, config_name)
  VALUES (v_kiosk_config, v_org, v_site, 'Demo default kiosk experience');

  INSERT INTO kiosk_experience_configuration_versions (
    id, kiosk_experience_configuration_id, branding_profile_version_id, version_number,
    idle_timeout_seconds, idle_warning_seconds, maintenance_mode_enabled,
    accessibility_large_text_enabled, effective_from, published_at, status_code
  ) VALUES (
    v_kiosk_version, v_kiosk_config, v_branding_version, 1,
    120, 30, FALSE, FALSE, NOW(), NOW(), v_published
  );

  INSERT INTO kiosk_experience_configuration_version_channels (id, kiosk_experience_configuration_version_id, capture_channel_code)
  SELECT gen_random_uuid(), v_kiosk_version, id
  FROM type_definition WHERE domain = 'capture_channel' AND code IN ('kiosk', 'assisted', 'qr', 'nfc_badge', 'ussd');

  INSERT INTO site_qr_references (id, organisation_id, site_id, qr_type_code, label)
  SELECT v_qr_ref, v_org, v_site, td.id, 'Demo public check-in'
  FROM type_definition td
  WHERE td.domain = 'site_qr_type' AND td.code = 'public_site_checkin';

  INSERT INTO site_qr_reference_rotations (
    id, organisation_id, site_id, site_qr_reference_id, opaque_token_hmac, active_from, active_until
  ) VALUES (
    gen_random_uuid(), v_org, v_site, v_qr_ref,
    'demo-seed-opaque-token-hmac-placeholder', NOW(), NOW() + INTERVAL '365 days'
  );

  INSERT INTO host_notification_escalation_policies (id, organisation_id, site_id, policy_name, deleted_at)
  VALUES (v_escalation_policy, v_org, v_site, 'Demo host no-response escalation', NULL);

  INSERT INTO host_notification_escalation_policy_versions (
    id, escalation_policy_id, version_number, wait_seconds, escalation_action_code,
    alternate_recipient_reference, effective_from, published_at, status_code
  )
  SELECT
    v_escalation_version, v_escalation_policy, 1, 300, action.id,
    'reception@buffrcheckpoint.test', NOW(), NOW(), v_published
  FROM type_definition action
  WHERE action.domain = 'host_notification_escalation_action' AND action.code = 'notify_reception';
END $$;
