-- Default published check-in form for Buffr Analytics demo org (FR-K09).
-- Org: 47c8b69b-5d9c-499d-a759-debc33e87c5e
-- Safe to re-run (upsert by id).

WITH types AS (
  SELECT code, id FROM type_definition WHERE domain = 'visitor_type' AND deleted_at IS NULL
),
field_class AS (
  SELECT code, id FROM type_definition WHERE domain = 'field_class' AND deleted_at IS NULL
),
form_status AS (
  SELECT code, id FROM type_definition WHERE domain = 'form_version_status' AND deleted_at IS NULL
)
INSERT INTO check_in_form_definitions (
  id, organisation_id, visitor_category_code, site_id, form_name, status_code, deleted_at
)
SELECT
  'f1111111-1111-4111-8111-111111111101'::uuid,
  '47c8b69b-5d9c-499d-a759-debc33e87c5e'::uuid,
  (SELECT id FROM types WHERE code = 'general'),
  NULL,
  'General visitor check-in',
  (SELECT id FROM form_status WHERE code = 'published'),
  NULL
WHERE EXISTS (SELECT 1 FROM types WHERE code = 'general')
ON CONFLICT (id) DO UPDATE SET
  form_name = EXCLUDED.form_name,
  deleted_at = NULL;

INSERT INTO check_in_form_versions (
  id, form_definition_id, version_number, effective_from, status_code, deleted_at
)
SELECT
  'f1111111-1111-4111-8111-111111111201'::uuid,
  'f1111111-1111-4111-8111-111111111101'::uuid,
  1,
  NOW(),
  (SELECT id FROM type_definition WHERE domain = 'form_version_status' AND code = 'published' AND deleted_at IS NULL LIMIT 1),
  NULL
ON CONFLICT (id) DO UPDATE SET
  status_code = EXCLUDED.status_code,
  deleted_at = NULL;

INSERT INTO check_in_form_fields (
  id, form_version_id, field_code, field_label, data_classification_code,
  required, visibility_rule, validation_schema, display_order, deleted_at
)
SELECT v.id, v.form_version_id, v.field_code, v.field_label,
  (SELECT id FROM type_definition WHERE domain = 'field_class' AND code = v.field_class AND deleted_at IS NULL LIMIT 1),
  v.required, '{}'::jsonb, '{}'::jsonb, v.display_order, NULL
FROM (VALUES
  ('f1111111-1111-4111-8111-111111111301'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'visitor_name', 'Full name', 'core', TRUE, 1),
  ('f1111111-1111-4111-8111-111111111302'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'visitor_phone', 'Mobile number', 'core', TRUE, 2),
  ('f1111111-1111-4111-8111-111111111303'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'company_name', 'Organisation / company', 'basic', TRUE, 3),
  ('f1111111-1111-4111-8111-111111111304'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'visitor_email', 'Email (optional)', 'basic', FALSE, 4),
  ('f1111111-1111-4111-8111-111111111305'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'id_document_number', 'ID / passport (optional)', 'sensitive', FALSE, 5),
  ('f1111111-1111-4111-8111-111111111306'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'vehicle_registration', 'Vehicle registration (optional)', 'basic', FALSE, 6),
  ('f1111111-1111-4111-8111-111111111307'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'host', 'Who are you visiting', 'core', TRUE, 7),
  ('f1111111-1111-4111-8111-111111111308'::uuid, 'f1111111-1111-4111-8111-111111111201'::uuid, 'purpose_category', 'Purpose of visit', 'basic', FALSE, 8)
) AS v(id, form_version_id, field_code, field_label, field_class, required, display_order)
ON CONFLICT (id) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  required = EXCLUDED.required,
  display_order = EXCLUDED.display_order,
  deleted_at = NULL;

INSERT INTO visitor_categories (
  id, organisation_id, visitor_category_code, form_definition_id,
  default_assurance_level_code, default_risk_tier_code, deleted_at
)
SELECT
  'f1111111-1111-4111-8111-111111111401'::uuid,
  '47c8b69b-5d9c-499d-a759-debc33e87c5e'::uuid,
  (SELECT id FROM type_definition WHERE domain = 'visitor_type' AND code = 'general' AND deleted_at IS NULL LIMIT 1),
  'f1111111-1111-4111-8111-111111111101'::uuid,
  (SELECT id FROM type_definition WHERE domain = 'identity_assurance_level' AND code = 'V0' AND deleted_at IS NULL LIMIT 1),
  (SELECT id FROM type_definition WHERE domain = 'risk_tier' AND code = 'tier_2_standard' AND deleted_at IS NULL LIMIT 1),
  NULL
WHERE EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'visitor_type' AND code = 'general' AND deleted_at IS NULL
)
ON CONFLICT (id) DO UPDATE SET
  form_definition_id = EXCLUDED.form_definition_id,
  deleted_at = NULL;
