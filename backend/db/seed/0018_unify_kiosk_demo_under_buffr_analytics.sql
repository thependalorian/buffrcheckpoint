-- Unify kiosk demo tenancy under Buffr Analytics.
-- Product rule: a kiosk belongs to the same organisation it serves.
--
-- From: 47c8b69b-5d9c-499d-a759-debc33e87c5e ("Buffr Checkpoint Kiosk Demo")
-- To:   b51f0704-12a7-45d4-8b0d-3642785b6e77 (Buffr Financial Services CC / Buffr Analytics)
--
-- Demo Front Desk site id stays 74c72c99-93dc-4b33-934b-9b365e9924cf.
-- Safe to re-run (idempotent once site.organisation_id already equals target).

DO $$
DECLARE
  v_old UUID := '47c8b69b-5d9c-499d-a759-debc33e87c5e';
  v_new UUID := 'b51f0704-12a7-45d4-8b0d-3642785b6e77';
  v_site UUID := '74c72c99-93dc-4b33-934b-9b365e9924cf';
  v_owner_new UUID;
  v_support_new UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organisations WHERE id = v_new AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Buffr Analytics org % missing', v_new;
  END IF;

  -- Already unified.
  IF EXISTS (
    SELECT 1 FROM sites
    WHERE id = v_site AND organisation_id = v_new AND deleted_at IS NULL
  ) THEN
    UPDATE organisations
    SET deleted_at = COALESCE(deleted_at, NOW()),
        legal_name = 'Buffr Checkpoint Kiosk Demo (retired)',
        trading_name = 'Buffr Checkpoint Kiosk Demo (retired)'
    WHERE id = v_old AND deleted_at IS NULL;
    RETURN;
  END IF;

  SELECT id INTO v_owner_new
  FROM role_definitions
  WHERE organisation_id = v_new
    AND deleted_at IS NULL
    AND role_code = (
      SELECT id FROM type_definition WHERE domain = 'role_code' AND code = 'owner_operator' LIMIT 1
    )
  LIMIT 1;

  SELECT id INTO v_support_new
  FROM role_definitions
  WHERE organisation_id = v_new
    AND deleted_at IS NULL
    AND role_code = (
      SELECT id FROM type_definition WHERE domain = 'role_code' AND code = 'platform_support' LIMIT 1
    )
  LIMIT 1;

  IF v_owner_new IS NULL THEN
    RAISE EXCEPTION 'Analytics owner_operator role missing on %', v_new;
  END IF;
  IF v_support_new IS NULL THEN
    RAISE EXCEPTION 'Analytics platform_support role missing on %', v_new;
  END IF;

  -- Site spine + visitor experience
  UPDATE sites SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE security_zones SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE site_hosts SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE site_branding_profiles SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE kiosk_experience_configurations SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE site_qr_references SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE site_qr_reference_rotations SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE host_notification_escalation_policies SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE host_notification_escalation_events SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE managed_kiosk_devices SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE site_checkin_code SET organisation_id = v_new WHERE organisation_id = v_old;

  -- Forms / categories / directory
  UPDATE check_in_form_definitions SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visitor_categories SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE organisation_units SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE organisation_settings SET organisation_id = v_new WHERE organisation_id = v_old;

  -- Operational visit data (demo history)
  UPDATE visitor_subjects SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visitor_visits SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visit_form_answers SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visitor_wait_queue_entries SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE emergency_roll_call_events SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE notification_delivery_instructions SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE audit_events SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE kiosk_privacy_pre_checkin_acknowledgements SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visitor_policy_acknowledgements SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visitor_policy_documents SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE visit_invitations SET organisation_id = v_new WHERE organisation_id = v_old;
  UPDATE feature_phone_check_in_sessions SET organisation_id = v_new WHERE organisation_id = v_old;

  -- Users: home org → Analytics
  UPDATE application_users
  SET organisation_id = v_new
  WHERE organisation_id = v_old
    AND deleted_at IS NULL;

  -- Memberships: re-point to Analytics role rows (avoid unique collisions)
  UPDATE organisation_memberships om
  SET
    organisation_id = v_new,
    role_id = CASE
      WHEN u.email = 'platform-ops-demo@buffrcheckpoint.test' THEN v_support_new
      ELSE v_owner_new
    END
  FROM application_users u
  WHERE om.user_id = u.id
    AND om.organisation_id = v_old
    AND om.deleted_at IS NULL;

  UPDATE membership_scopes ms
  SET scope_id = v_new
  FROM organisation_memberships om
  WHERE ms.membership_id = om.id
    AND om.organisation_id = v_new
    AND ms.scope_type = 'organisation'
    AND ms.scope_id = v_old;

  -- Retire old role rows and the orphan org
  UPDATE role_definitions
  SET deleted_at = NOW()
  WHERE organisation_id = v_old AND deleted_at IS NULL;

  UPDATE organisations
  SET
    deleted_at = NOW(),
    legal_name = 'Buffr Checkpoint Kiosk Demo (retired)',
    trading_name = 'Buffr Checkpoint Kiosk Demo (retired)'
  WHERE id = v_old AND deleted_at IS NULL;

  -- Keep Analytics branding tokens on published demo version
  UPDATE site_branding_profile_versions
  SET
    organisation_display_name = 'Buffr Analytics',
    welcome_message = 'Welcome to Buffr Analytics',
    site_display_name = COALESCE(site_display_name, 'Demo Front Desk'),
    brand_colour_token = '#CF1161',
    help_contact_reference = 'team@buffranalytics.com',
    logo_artifact_id = '/org-assets/buffr-analytics/icon.png'
  WHERE id = 'b1111111-1111-4111-8111-111111111102';
END $$;
