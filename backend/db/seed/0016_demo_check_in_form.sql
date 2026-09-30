-- Default published check-in form for Buffr Analytics demo org (FR-K09 / v0.28).
-- Org: b51f0704-12a7-45d4-8b0d-3642785b6e77
-- Safe to re-run (upsert by id).

WITH types AS (
  SELECT code, id FROM type_definition WHERE domain = 'visitor_type' AND deleted_at IS NULL
),
form_status AS (
  SELECT code, id FROM type_definition WHERE domain = 'form_version_status' AND deleted_at IS NULL
)
INSERT INTO check_in_form_definitions (
  id, organisation_id, visitor_category_code, site_id, form_name, status_code, deleted_at
)
SELECT
  'f1111111-1111-4111-8111-111111111101'::uuid,
  'b51f0704-12a7-45d4-8b0d-3642785b6e77'::uuid,
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
  id, form_version_id, field_code, field_label, field_type_code, help_text,
  data_classification_code, required, visibility_rule, validation_schema, display_order, deleted_at
)
SELECT
  v.id,
  v.form_version_id,
  v.field_code,
  v.field_label,
  (SELECT id FROM type_definition WHERE domain = 'field_type' AND code = v.field_type AND deleted_at IS NULL LIMIT 1),
  v.help_text,
  (SELECT id FROM type_definition WHERE domain = 'field_class' AND code = v.field_class AND deleted_at IS NULL LIMIT 1),
  v.required,
  v.visibility_rule::jsonb,
  v.validation_schema::jsonb,
  v.display_order,
  NULL
FROM (VALUES
  (
    'f1111111-1111-4111-8111-111111111301'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'visitor_name', 'Full name', 'text', NULL::text, 'core', TRUE,
    '{}', '{}', 1
  ),
  (
    'f1111111-1111-4111-8111-111111111302'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'visitor_phone', 'Mobile number', 'phone', NULL::text, 'core', TRUE,
    '{}', '{}', 2
  ),
  (
    'f1111111-1111-4111-8111-111111111303'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'company_name', 'Organisation / company', 'text', NULL::text, 'basic', TRUE,
    '{}', '{}', 3
  ),
  (
    'f1111111-1111-4111-8111-111111111304'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'visitor_email', 'Email (optional)', 'email', NULL::text, 'basic', FALSE,
    '{}', '{}', 4
  ),
  (
    'f1111111-1111-4111-8111-111111111305'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'id_document_number', 'ID / passport (optional)', 'text', NULL::text, 'sensitive', FALSE,
    '{}', '{}', 5
  ),
  (
    'f1111111-1111-4111-8111-111111111307'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'host', 'Who are you visiting', 'text', NULL::text, 'core', TRUE,
    '{}', '{}', 6
  ),
  (
    'f1111111-1111-4111-8111-111111111308'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'purpose_category', 'Purpose of visit', 'single_choice', NULL::text, 'basic', FALSE,
    '{}',
    '{"options":["meeting","delivery","interview","vehicle","other"]}',
    7
  ),
  (
    'f1111111-1111-4111-8111-111111111306'::uuid,
    'f1111111-1111-4111-8111-111111111201'::uuid,
    'vehicle_registration', 'Vehicle registration', 'text',
    'Required when purpose is vehicle-related',
    'basic', FALSE,
    '{"op":"and","conditions":[{"fieldCode":"purpose_category","equals":"vehicle"}]}',
    '{"requiredIf":{"op":"and","conditions":[{"fieldCode":"purpose_category","equals":"vehicle"}]}}',
    8
  )
) AS v(
  id, form_version_id, field_code, field_label, field_type, help_text, field_class,
  required, visibility_rule, validation_schema, display_order
)
ON CONFLICT (id) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type_code = EXCLUDED.field_type_code,
  help_text = EXCLUDED.help_text,
  required = EXCLUDED.required,
  visibility_rule = EXCLUDED.visibility_rule,
  validation_schema = EXCLUDED.validation_schema,
  display_order = EXCLUDED.display_order,
  deleted_at = NULL;

INSERT INTO check_in_form_field_translations (
  id, field_id, language_code, field_label, help_text, deleted_at
)
SELECT
  v.id,
  v.field_id,
  (SELECT id FROM type_definition WHERE domain = 'language_code' AND code = v.lang AND deleted_at IS NULL LIMIT 1),
  v.field_label,
  v.help_text,
  NULL
FROM (VALUES
  (
    'f1111111-1111-4111-8111-111111111501'::uuid,
    'f1111111-1111-4111-8111-111111111301'::uuid,
    'af', 'Volle naam', NULL::text
  ),
  (
    'f1111111-1111-4111-8111-111111111502'::uuid,
    'f1111111-1111-4111-8111-111111111302'::uuid,
    'af', 'Selfoonnommer', NULL::text
  ),
  (
    'f1111111-1111-4111-8111-111111111503'::uuid,
    'f1111111-1111-4111-8111-111111111306'::uuid,
    'af', 'Voertuigregistrasie', 'Verpligtend wanneer die doel voertuigverwant is'
  )
) AS v(id, field_id, lang, field_label, help_text)
WHERE EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'language_code' AND code = v.lang AND deleted_at IS NULL
)
ON CONFLICT (id) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  help_text = EXCLUDED.help_text,
  deleted_at = NULL;

INSERT INTO visitor_categories (
  id, organisation_id, visitor_category_code, form_definition_id,
  default_assurance_level_code, default_risk_tier_code, deleted_at
)
SELECT
  'f1111111-1111-4111-8111-111111111401'::uuid,
  'b51f0704-12a7-45d4-8b0d-3642785b6e77'::uuid,
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
