-- Demo BIAN organisation directory for Buffr Analytics kiosk org + host links.
-- Org:  47c8b69b-5d9c-499d-a759-debc33e87c5e
-- Site: 74c72c99-93dc-4b33-934b-9b365e9924cf
-- Other orgs default to custom mode and start empty until they seed or add units.
-- Safe to re-run (upsert by id).

UPDATE organisation_settings
SET directory_taxonomy_mode_code = (
  SELECT id FROM type_definition
  WHERE domain = 'organisation_directory_mode' AND code = 'bian_aligned' AND deleted_at IS NULL
  LIMIT 1
),
updated_at = NOW()
WHERE organisation_id = '47c8b69b-5d9c-499d-a759-debc33e87c5e'
  AND directory_taxonomy_mode_code IS DISTINCT FROM (
    SELECT id FROM type_definition
    WHERE domain = 'organisation_directory_mode' AND code = 'bian_aligned' AND deleted_at IS NULL
    LIMIT 1
  );

-- Resolve type ids
WITH kinds AS (
  SELECT code, id FROM type_definition
  WHERE domain = 'organisation_unit_kind' AND deleted_at IS NULL
),
areas AS (
  SELECT code, id FROM type_definition
  WHERE domain = 'bian_business_area' AND deleted_at IS NULL
),
active_status AS (
  SELECT id FROM type_definition
  WHERE domain = 'organisation_unit_status' AND code = 'active' AND deleted_at IS NULL
  LIMIT 1
)
INSERT INTO organisation_units (
  id, organisation_id, site_id, parent_id, unit_kind_code, bian_area_code,
  code, name, description, sort_order, deleted_at
)
SELECT
  u.id,
  '47c8b69b-5d9c-499d-a759-debc33e87c5e'::uuid,
  NULL,
  u.parent_id,
  (SELECT id FROM kinds WHERE code = u.kind),
  (SELECT id FROM areas WHERE code = u.bian_area),
  u.code,
  u.name,
  u.description,
  u.sort_order,
  NULL
FROM (VALUES
  -- Business Areas (BIAN landscape columns)
  ('b1111111-1111-4111-8111-111111111101'::uuid, NULL::uuid, 'business_area', 'reference_data',
   'reference_data', 'Reference Data',
   'Internally and externally sourced reference information used across the organisation (BIAN: Party, Market Data, Product Management).', 1),
  ('b1111111-1111-4111-8111-111111111102'::uuid, NULL, 'business_area', 'sales_and_service',
   'sales_and_service', 'Sales & Service',
   'Customer-facing sales and servicing across channels.', 2),
  ('b1111111-1111-4111-8111-111111111103'::uuid, NULL, 'business_area', 'operations_and_execution',
   'operations_and_execution', 'Operations & Execution',
   'Product fulfillment, market operations, and shared cross-product operations (including payments and operational services).', 3),
  ('b1111111-1111-4111-8111-111111111104'::uuid, NULL, 'business_area', 'risk_and_compliance',
   'risk_and_compliance', 'Risk & Compliance',
   'Portfolio, models, business analysis, regulation and compliance.', 4),
  ('b1111111-1111-4111-8111-111111111105'::uuid, NULL, 'business_area', 'business_support',
   'business_support', 'Business Support',
   'Enterprise support: IT, facilities, HR, communication, procurement, corporate relations.', 5),

  -- Reference Data domains
  ('b1111111-1111-4111-8111-111111111201'::uuid, 'b1111111-1111-4111-8111-111111111101'::uuid, 'business_domain', 'reference_data',
   'party', 'Party',
   'Party reference data directory — people and legal entities (BIAN Party Reference Data Directory analogue).', 1),
  ('b1111111-1111-4111-8111-111111111202'::uuid, 'b1111111-1111-4111-8111-111111111101'::uuid, 'business_domain', 'reference_data',
   'product_management', 'Product Management', 'Product catalogue and reference offerings.', 2),

  -- Business Support domains (email + facilities live here)
  ('b1111111-1111-4111-8111-111111111301'::uuid, 'b1111111-1111-4111-8111-111111111105'::uuid, 'business_domain', 'business_support',
   'facilities', 'Buildings, Equipment & Facilities',
   'Sites, reception, and physical visitor capture points.', 1),
  ('b1111111-1111-4111-8111-111111111302'::uuid, 'b1111111-1111-4111-8111-111111111105'::uuid, 'business_domain', 'business_support',
   'communication_education', 'Communication & Education',
   'Internal and external messaging — host email notifications map here (BIAN Communication).', 2),
  ('b1111111-1111-4111-8111-111111111303'::uuid, 'b1111111-1111-4111-8111-111111111105'::uuid, 'business_domain', 'business_support',
   'human_resource_management', 'Human Resource Management', 'People / HR functions.', 3),
  ('b1111111-1111-4111-8111-111111111304'::uuid, 'b1111111-1111-4111-8111-111111111105'::uuid, 'business_domain', 'business_support',
   'it_management', 'IT Management', 'IT operations and helpdesk.', 4),
  ('b1111111-1111-4111-8111-111111111305'::uuid, 'b1111111-1111-4111-8111-111111111105'::uuid, 'business_domain', 'business_support',
   'finance_admin', 'Finance', 'Finance and accounting support.', 5),

  -- Operations domain for wait queue semantics
  ('b1111111-1111-4111-8111-111111111401'::uuid, 'b1111111-1111-4111-8111-111111111103'::uuid, 'business_domain', 'operations_and_execution',
   'operational_services', 'Operational Services',
   'Shared operational utilities including reception visitor wait queue.', 1),

  -- Departments / service domains used as host homes
  ('b1111111-1111-4111-8111-111111111501'::uuid, 'b1111111-1111-4111-8111-111111111301'::uuid, 'department', 'business_support',
   'reception', 'Reception', 'Front-desk reception at the site.', 1),
  ('b1111111-1111-4111-8111-111111111502'::uuid, 'b1111111-1111-4111-8111-111111111305'::uuid, 'department', 'business_support',
   'finance', 'Finance', 'Finance team hosts.', 1),
  ('b1111111-1111-4111-8111-111111111503'::uuid, 'b1111111-1111-4111-8111-111111111304'::uuid, 'department', 'business_support',
   'engineering', 'Engineering', 'Engineering hosts.', 1),
  ('b1111111-1111-4111-8111-111111111504'::uuid, 'b1111111-1111-4111-8111-111111111303'::uuid, 'department', 'business_support',
   'people', 'People', 'People / HR hosts.', 1),
  ('b1111111-1111-4111-8111-111111111505'::uuid, 'b1111111-1111-4111-8111-111111111304'::uuid, 'department', 'business_support',
   'it_helpdesk', 'IT Helpdesk', 'IT helpdesk hosts.', 2),
  ('b1111111-1111-4111-8111-111111111506'::uuid, 'b1111111-1111-4111-8111-111111111302'::uuid, 'service_domain', 'business_support',
   'outbound_email', 'Outbound Email',
   'Host and escalation email delivery (Resend adapter).', 1),
  ('b1111111-1111-4111-8111-111111111507'::uuid, 'b1111111-1111-4111-8111-111111111401'::uuid, 'service_domain', 'operations_and_execution',
   'visitor_wait_queue', 'Visitor Wait Queue',
   'Reception queue tickets after visitor check-in.', 1)
) AS u(id, parent_id, kind, bian_area, code, name, description, sort_order)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  unit_kind_code = EXCLUDED.unit_kind_code,
  bian_area_code = EXCLUDED.bian_area_code,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  deleted_at = NULL;

-- Status events for newly inserted units (idempotent: only if none exist)
INSERT INTO organisation_unit_status_events (id, organisation_unit_id, from_status_code, to_status_code, occurred_at, actor_id, note)
SELECT
  gen_random_uuid(),
  u.id,
  NULL,
  (SELECT id FROM type_definition WHERE domain = 'organisation_unit_status' AND code = 'active' AND deleted_at IS NULL LIMIT 1),
  NOW(),
  NULL,
  'Seeded BIAN directory template'
FROM organisation_units u
WHERE u.organisation_id = '47c8b69b-5d9c-499d-a759-debc33e87c5e'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM organisation_unit_status_events e WHERE e.organisation_unit_id = u.id
  );

-- Link demo hosts to departments
UPDATE site_hosts SET organisation_unit_id = 'b1111111-1111-4111-8111-111111111501', department = 'Reception'
WHERE id = 'd2bc3287-689b-436b-97d5-c84d0734c7ff';

UPDATE site_hosts SET organisation_unit_id = 'b1111111-1111-4111-8111-111111111502', department = 'Finance'
WHERE id = 'a1111111-1111-4111-8111-111111111101';

UPDATE site_hosts SET organisation_unit_id = 'b1111111-1111-4111-8111-111111111503', department = 'Engineering'
WHERE id = 'a1111111-1111-4111-8111-111111111102';

UPDATE site_hosts SET organisation_unit_id = 'b1111111-1111-4111-8111-111111111504', department = 'People'
WHERE id = 'a1111111-1111-4111-8111-111111111103';

UPDATE site_hosts SET organisation_unit_id = 'b1111111-1111-4111-8111-111111111505', department = 'IT'
WHERE id = 'a1111111-1111-4111-8111-111111111104';
