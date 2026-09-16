-- v0.20 full-stack: policy version statuses, form version statuses, contact enquiries, visit form answers
-- STATUS: pending apply to Neon bold-cloud-47505421

INSERT INTO type_definition (domain, code, label, sort_order)
VALUES
  ('policy_version_status', 'draft', 'Draft', 10),
  ('policy_version_status', 'published', 'Published', 20),
  ('policy_version_status', 'superseded', 'Superseded', 30),
  ('policy_version_status', 'archived', 'Archived', 40),
  ('form_version_status', 'draft', 'Draft', 10),
  ('form_version_status', 'published', 'Published', 20),
  ('form_version_status', 'archived', 'Archived', 30),
  ('contact_enquiry_status', 'received', 'Received', 10),
  ('contact_enquiry_status', 'emailed', 'Emailed', 20),
  ('contact_enquiry_status', 'closed', 'Closed', 30),
  ('region_status', 'active', 'Active', 10),
  ('region_status', 'inactive', 'Inactive', 20)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id              UUID PRIMARY KEY,
  organisation_id UUID NULL REFERENCES organisations (id),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  company         TEXT NULL,
  message         TEXT NOT NULL,
  status_code     UUID NOT NULL REFERENCES type_definition (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiries_created
  ON contact_enquiries (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS contact_enquiry_status_log (
  id          UUID PRIMARY KEY,
  enquiry_id  UUID NOT NULL REFERENCES contact_enquiries (id),
  status_code UUID NOT NULL REFERENCES type_definition (id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by  UUID NULL,
  reason      TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_enquiry_status_log_enquiry
  ON contact_enquiry_status_log (enquiry_id, changed_at);

CREATE TABLE IF NOT EXISTS visit_form_answers (
  id                UUID PRIMARY KEY,
  organisation_id   UUID NOT NULL REFERENCES organisations (id),
  visit_id          UUID NOT NULL REFERENCES visitor_visits (id),
  form_version_id   UUID NOT NULL REFERENCES check_in_form_versions (id),
  field_code        TEXT NOT NULL,
  answer_value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_label_snapshot TEXT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_form_answers_org_visit
  ON visit_form_answers (organisation_id, visit_id)
  WHERE deleted_at IS NULL;

ALTER TABLE privacy_requests
  ADD COLUMN IF NOT EXISTS export_file_reference TEXT;
