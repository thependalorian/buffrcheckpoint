-- Buffr Checkpoint — grant platform_support to Buffr staff login
-- team@buffranalytics.com (no @buffrcheckpoint.com mailbox; this is the
-- operational email). Ops console requires platform_support; the account
-- was owner_operator on Buffr Analytics and hit "Wrong workspace".

DO $$
DECLARE
  staff_user_id UUID;
  home_org_id UUID := 'b51f0704-12a7-45d4-8b0d-3642785b6e77'; -- Buffr Financial Services CC
  role_code_id UUID;
  role_def_id UUID;
  membership_id UUID;
  initial_event UUID;
BEGIN
  SELECT id INTO staff_user_id FROM application_users
    WHERE lower(email) = lower('team@buffranalytics.com') AND deleted_at IS NULL;
  IF staff_user_id IS NULL THEN
    RAISE NOTICE 'team@buffranalytics.com not found — skip';
    RETURN;
  END IF;

  SELECT id INTO role_code_id FROM type_definition WHERE domain = 'role_code' AND code = 'platform_support';
  SELECT id INTO initial_event FROM type_definition WHERE domain = 'role_assignment_event_type' AND code = 'initial';

  SELECT id INTO role_def_id FROM role_definitions
    WHERE organisation_id = home_org_id AND role_code = role_code_id AND deleted_at IS NULL;
  IF role_def_id IS NULL THEN
    role_def_id := gen_random_uuid();
    INSERT INTO role_definitions (
      id, organisation_id, role_code, role_label, is_system_role, requires_mfa, requires_verified_email
    ) VALUES (
      role_def_id, home_org_id, role_code_id, 'Platform Support', TRUE, TRUE, TRUE
    );
  END IF;

  SELECT id INTO membership_id FROM organisation_memberships
    WHERE user_id = staff_user_id AND organisation_id = home_org_id AND deleted_at IS NULL
    LIMIT 1;

  IF membership_id IS NULL THEN
    membership_id := gen_random_uuid();
    INSERT INTO organisation_memberships (id, organisation_id, user_id, role_id, assignment_event_type_code)
      VALUES (membership_id, home_org_id, staff_user_id, role_def_id, initial_event);
    INSERT INTO membership_scopes (id, membership_id, scope_type, scope_id)
      VALUES (gen_random_uuid(), membership_id, 'organisation', home_org_id);
  ELSE
    UPDATE organisation_memberships SET role_id = role_def_id WHERE id = membership_id;
  END IF;
END $$;
