-- Buffr Checkpoint — platform_support demo account, for exercising the
-- Platform Ops Console's break-glass support-session flow end-to-end
-- (buffrcheckpoint.md Section 11.9.1a). Home org is the existing
-- "Buffr Checkpoint Kiosk Demo" org — a platform_support user's own
-- organisationId is just an FK-satisfying home row; they never act on it
-- directly (their real endpoints are cross-tenant aggregate reads or
-- grant-gated support sessions targeting *other* orgs).
--
-- Login: platform-ops-demo@buffrcheckpoint.test / PlatformOps!2026

DO $$
DECLARE
  home_org_id UUID := '47c8b69b-5d9c-499d-a759-debc33e87c5e'; -- Buffr Checkpoint Kiosk Demo
  demo_user_id UUID;
  role_def_id UUID;
  role_code_id UUID;
  membership_id UUID;
BEGIN
  SELECT id INTO role_code_id FROM type_definition WHERE domain = 'role_code' AND code = 'platform_support';

  SELECT id INTO role_def_id FROM role_definitions
    WHERE organisation_id = home_org_id AND role_code = role_code_id;
  IF role_def_id IS NULL THEN
    role_def_id := gen_random_uuid();
    INSERT INTO role_definitions (id, organisation_id, role_code, role_label, is_system_role)
      VALUES (role_def_id, home_org_id, role_code_id, 'Platform Support', TRUE);
  END IF;

  SELECT id INTO demo_user_id FROM application_users WHERE email = 'platform-ops-demo@buffrcheckpoint.test';
  IF demo_user_id IS NULL THEN
    demo_user_id := gen_random_uuid();
    INSERT INTO application_users (id, organisation_id, email, password_hash, email_verified_at, mfa_enabled)
      VALUES (
        demo_user_id,
        home_org_id,
        'platform-ops-demo@buffrcheckpoint.test',
        '$2a$12$iF5iqKB6aDUXvYheUBuMr.ewYtop4MGWlDKHfekB4d4DDkrRjbeRi', -- PlatformOps!2026
        NOW(),
        FALSE
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organisation_memberships WHERE user_id = demo_user_id AND organisation_id = home_org_id AND deleted_at IS NULL
  ) THEN
    membership_id := gen_random_uuid();
    INSERT INTO organisation_memberships (id, organisation_id, user_id, role_id, assignment_event_type_code)
      SELECT membership_id, home_org_id, demo_user_id, role_def_id, id
      FROM type_definition WHERE domain = 'role_assignment_event_type' AND code = 'initial';
    INSERT INTO membership_scopes (id, membership_id, scope_type, scope_id)
      VALUES (gen_random_uuid(), membership_id, 'organisation', home_org_id);
  END IF;
END $$;
