-- Buffr Checkpoint v0.28 — form builder: field types, help text, translations.

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('field_type', 'text', 'Text', 1),
  ('field_type', 'textarea', 'Text area', 2),
  ('field_type', 'single_choice', 'Single choice', 3),
  ('field_type', 'multiple_choice', 'Multiple choice', 4),
  ('field_type', 'date', 'Date', 5),
  ('field_type', 'boolean', 'Yes / no', 6),
  ('field_type', 'phone', 'Phone', 7),
  ('field_type', 'email', 'Email', 8),
  ('check_in_field_code', 'visitor_name', 'Full name', 1),
  ('check_in_field_code', 'visitor_phone', 'Mobile number', 2),
  ('check_in_field_code', 'company_name', 'Organisation / company', 3),
  ('check_in_field_code', 'visitor_email', 'Email', 4),
  ('check_in_field_code', 'id_document_number', 'ID / passport', 5),
  ('check_in_field_code', 'vehicle_registration', 'Vehicle registration', 6),
  ('check_in_field_code', 'host', 'Who are you visiting', 7),
  ('check_in_field_code', 'purpose_category', 'Purpose of visit', 8),
  ('check_in_field_code', 'visitor_type', 'Visitor type', 9),
  ('check_in_field_code', 'visitor_category', 'Visitor category', 10)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

ALTER TABLE check_in_form_fields
  ADD COLUMN IF NOT EXISTS field_type_code UUID NULL REFERENCES type_definition (id),
  ADD COLUMN IF NOT EXISTS help_text TEXT NULL;

UPDATE check_in_form_fields f
SET field_type_code = t.id
FROM type_definition t
WHERE f.field_type_code IS NULL
  AND t.domain = 'field_type'
  AND t.code = CASE f.field_code
    WHEN 'visitor_phone' THEN 'phone'
    WHEN 'visitor_email' THEN 'email'
    WHEN 'purpose_category' THEN 'single_choice'
    ELSE 'text'
  END
  AND t.deleted_at IS NULL;

UPDATE check_in_form_fields f
SET field_type_code = t.id
FROM type_definition t
WHERE f.field_type_code IS NULL
  AND t.domain = 'field_type'
  AND t.code = 'text'
  AND t.deleted_at IS NULL;

ALTER TABLE check_in_form_fields
  ALTER COLUMN field_type_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS check_in_form_field_translations (
  id            UUID PRIMARY KEY,
  field_id      UUID NOT NULL REFERENCES check_in_form_fields (id),
  language_code UUID NOT NULL REFERENCES type_definition (id),
  field_label   TEXT NULL,
  help_text     TEXT NULL,
  deleted_at    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_check_in_form_field_translations_field
  ON check_in_form_field_translations (field_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_check_in_form_field_translations_unique
  ON check_in_form_field_translations (field_id, language_code)
  WHERE deleted_at IS NULL;
