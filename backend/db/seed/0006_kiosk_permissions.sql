-- Buffr Checkpoint kiosk app — Addition A permission.
-- Source: kiosk implementation plan, "Backend additions required".
-- credential.validate is deliberately narrower than site.configure (the
-- permission that gates credential issue/revoke): a kiosk needs to check
-- whether a scanned NFC reference is currently active, but must never be
-- able to issue or revoke a credential itself.

INSERT INTO permission_definitions (permission_code, description, risk_classification) VALUES
  ('credential.validate', 'Validate a scanned access credential reference at check-in', 'standard');

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    ('front_desk_operator', 'credential.validate'),
    ('site_manager', 'credential.validate'),
    ('owner_operator', 'credential.validate'),
    ('system_administrator', 'credential.validate')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code;
