-- Buffr Checkpoint — onboarding authority (buffrcheckpoint.md v0.33, §9.2 rule 10).
--
-- Before this, POST /auth/onboarding/complete-step carried no permission, so
-- any signed-in user of an organisation (an invited host, a front-desk
-- operator) could complete setup steps or approve go-live. Production status
-- log showed invited users regressing a live organisation through email
-- verification and MFA enrolment. Two codes:
--   organisation.onboarding.manage — customer-side: complete setup steps and
--     approve go-live (Owner-Operator, System Administrator).
--   platform.onboarding.manage — Buffr-internal: reopen setup or override a
--     customer's onboarding status with a recorded reason (replaces direct SQL).
--
-- Config rows only; no schema change.

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('organisation.onboarding.manage', 'Complete organisation setup steps and approve go-live', 'critical'),
  ('platform.onboarding.manage', 'Reopen setup or override a customer organisation''s onboarding status', 'critical')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    ('owner_operator', 'organisation.onboarding.manage'),
    ('system_administrator', 'organisation.onboarding.manage'),
    ('platform_support', 'platform.onboarding.manage')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
