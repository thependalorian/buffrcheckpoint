-- Business verification pipeline: several supporting documents per organisation, each reviewed on its own, the registration details
-- pre-filled from the founding statement where it can be read, and a "needs information" outcome that names the fields to correct.
-- Additive and idempotent. The new tables follow the schema rules: type_definition for every list, a status log created with the
-- stateful table, tenant column first in every index, soft delete, no triggers and no cascades.
-- NOTE FOR THE OWNER: two new tables are proposals under buffrcheckpoint.md 14.1 rule 9 until signed off.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('kyb_status', 'needs_info', 'Needs information', 5),
  ('kyb_status', 'superseded', 'Replaced by a newer submission', 6),
  ('kyb_entity_type', 'close_corporation', 'Close corporation', 1),
  ('kyb_entity_type', 'private_company', 'Private company', 2),
  ('kyb_entity_type', 'public_company', 'Public company', 3),
  ('kyb_entity_type', 'non_profit', 'Non-profit organisation', 4),
  ('kyb_entity_type', 'sole_proprietor', 'Sole proprietor', 5),
  ('kyb_entity_type', 'government_body', 'Government body', 6),
  ('kyb_entity_type', 'other', 'Other', 7),
  ('kyb_document_type', 'founding_statement', 'Founding statement (CC1)', 1),
  ('kyb_document_type', 'registration_certificate', 'Registration certificate', 2),
  ('kyb_document_type', 'amended_founding_statement', 'Amended founding statement (CC2)', 3),
  ('kyb_document_type', 'tax_good_standing', 'Tax good standing certificate', 4),
  ('kyb_document_type', 'proof_of_address', 'Proof of registered address', 5),
  ('kyb_document_type', 'signatory_id', 'Authorised signatory identity document', 6),
  ('kyb_document_type', 'authority_letter', 'Letter or resolution of authority', 7),
  ('kyb_document_type', 'other', 'Other supporting document', 8),
  ('kyb_document_status', 'received', 'Received', 1),
  ('kyb_document_status', 'accepted', 'Accepted', 2),
  ('kyb_document_status', 'rejected', 'Rejected', 3),
  ('notification_template_code', 'kyb_needs_info', 'Business verification: more information needed', 41)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

ALTER TABLE organisation_kyb_verification ADD COLUMN IF NOT EXISTS entity_type_code UUID REFERENCES type_definition (id);
ALTER TABLE organisation_kyb_verification ADD COLUMN IF NOT EXISTS principal_business TEXT;
ALTER TABLE organisation_kyb_verification ADD COLUMN IF NOT EXISTS financial_year_end TEXT;
ALTER TABLE organisation_kyb_verification ADD COLUMN IF NOT EXISTS members_protected JSONB;
ALTER TABLE organisation_kyb_verification ADD COLUMN IF NOT EXISTS field_sources JSONB;
ALTER TABLE organisation_kyb_status_events ADD COLUMN IF NOT EXISTS flagged_fields JSONB;

CREATE TABLE IF NOT EXISTS organisation_kyb_document (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  document_type_code    UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  file_reference        TEXT NOT NULL,
  file_name             TEXT NOT NULL,
  content_type          TEXT NOT NULL,
  size_bytes            INTEGER NOT NULL,
  content_sha256        TEXT NOT NULL,
  extraction_method     TEXT,
  extraction_protected  JSONB,
  uploaded_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_organisation_kyb_document_org
  ON organisation_kyb_document (organisation_id, created_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS organisation_kyb_document_status_events (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  document_id      UUID NOT NULL REFERENCES organisation_kyb_document (id),
  from_status_code UUID REFERENCES type_definition (id),
  to_status_code   UUID NOT NULL REFERENCES type_definition (id),
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id         UUID,
  note             TEXT
);
CREATE INDEX IF NOT EXISTS idx_organisation_kyb_document_status_events_doc
  ON organisation_kyb_document_status_events (organisation_id, document_id, occurred_at);

-- Status logs are append-only for the runtime role (0055). Guarded so a replay without the role still passes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE organisation_kyb_document TO buffr_checkpoint_runtime;
    GRANT SELECT, INSERT ON TABLE organisation_kyb_document_status_events TO buffr_checkpoint_runtime;
    REVOKE UPDATE, DELETE ON TABLE organisation_kyb_document_status_events FROM buffr_checkpoint_runtime;
  END IF;
END
$$;

INSERT INTO platform_notification_template (id, template_code, channel_code, subject, body)
SELECT gen_random_uuid(), tc.id, ch.id, d.subject, d.body
FROM (VALUES
  (
    'kyb_needs_info',
    'More information needed for {{organisationName}} business verification',
    'We have started reviewing the business verification for {{organisationName}} and need a little more from you before we can approve it.' || chr(10) || chr(10) ||
    '{{note}}' || chr(10) || chr(10) ||
    'Open Business Verification in your admin to correct the details or add the documents we asked for. Everything you already sent is kept, so you only need to change what is listed.'
  )
) AS d(code, subject, body)
JOIN type_definition tc ON tc.domain = 'notification_template_code' AND tc.code = d.code
JOIN type_definition ch ON ch.domain = 'notification_channel' AND ch.code = 'email'
WHERE NOT EXISTS (
  SELECT 1 FROM platform_notification_template n WHERE n.template_code = tc.id AND n.channel_code = ch.id AND n.deleted_at IS NULL
);

COMMIT;
