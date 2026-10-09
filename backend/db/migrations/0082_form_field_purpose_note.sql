-- PR-2: collect only what the purpose needs, with a field-by-field justification. A form field above the basic class carries a
-- purpose note stating why it is asked. Additive and idempotent: one nullable column.
BEGIN;

ALTER TABLE check_in_form_fields ADD COLUMN IF NOT EXISTS purpose_note text;

COMMENT ON COLUMN check_in_form_fields.purpose_note IS
  'Internal. Why the form asks for this field, in the customer''s words; required before publishing any field above the basic class.';

COMMIT;
