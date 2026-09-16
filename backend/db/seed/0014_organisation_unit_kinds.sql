-- Organisation directory + wait-queue type_definition domains.
-- BIAN Service Landscape hierarchy kinds and area codes (tenant-agnostic).
-- Safe to re-run: ON CONFLICT on (domain, code) via unique index — use NOT EXISTS.

INSERT INTO type_definition (domain, code, label, sort_order)
SELECT v.domain, v.code, v.label, v.sort_order
FROM (VALUES
  -- Hierarchy kinds (Business Area → Business Domain → Service Domain → department/team)
  ('organisation_unit_kind', 'business_area', 'Business Area', 1),
  ('organisation_unit_kind', 'business_domain', 'Business Domain', 2),
  ('organisation_unit_kind', 'service_domain', 'Service Domain', 3),
  ('organisation_unit_kind', 'department', 'Department', 4),
  ('organisation_unit_kind', 'team', 'Team', 5),

  -- BIAN Business Areas (Service Landscape layout used for org directory)
  ('bian_business_area', 'reference_data', 'Reference Data', 1),
  ('bian_business_area', 'sales_and_service', 'Sales & Service', 2),
  ('bian_business_area', 'operations_and_execution', 'Operations & Execution', 3),
  ('bian_business_area', 'risk_and_compliance', 'Risk & Compliance', 4),
  ('bian_business_area', 'business_support', 'Business Support', 5),

  -- Unit lifecycle (status events)
  ('organisation_unit_status', 'active', 'Active', 1),
  ('organisation_unit_status', 'archived', 'Archived', 2),

  -- Reception wait queue (not kiosk offline outbox)
  ('wait_queue_status', 'waiting', 'Waiting', 1),
  ('wait_queue_status', 'called', 'Called', 2),
  ('wait_queue_status', 'completed', 'Completed', 3),
  ('wait_queue_status', 'cancelled', 'Cancelled', 4),

  -- How the tenant chooses to organise their directory (BIAN is optional)
  ('organisation_directory_mode', 'custom', 'Custom structure', 1),
  ('organisation_directory_mode', 'bian_aligned', 'BIAN Service Landscape', 2),
  ('organisation_directory_mode', 'hybrid', 'Hybrid (BIAN + custom)', 3)
) AS v(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition t
  WHERE t.domain = v.domain AND t.code = v.code AND t.deleted_at IS NULL
);
