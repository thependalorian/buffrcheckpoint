-- Owner/front-desk must be able to approve host-gated visits at the desk.
-- Seed 0004 only granted visit.access.approve to host_staff; owner_operator
-- is the demo/admin login and was 403 on POST /visits/:id/approve.

INSERT INTO role_permission_grants (role_code, permission_code)
SELECT td.id, p.permission_code
FROM type_definition td
CROSS JOIN (VALUES
  ('owner_operator', 'visit.access.approve'),
  ('front_desk_operator', 'visit.access.approve'),
  ('site_manager', 'visit.access.approve')
) AS grants(role_code, permission_code)
JOIN permission_definitions p ON p.permission_code = grants.permission_code
WHERE td.domain = 'role_code'
  AND td.code = grants.role_code
  AND NOT EXISTS (
    SELECT 1
    FROM role_permission_grants existing
    WHERE existing.role_code = td.id
      AND existing.permission_code = p.permission_code
  );
