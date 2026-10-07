-- Visit rating: an optional comment next to the star rating.
--
-- 0044 left the comment out on purpose: a public free-text box collects names and health details, so it may only be added through
-- the protected personal-data envelope, in its own additive migration. This is that migration. The comment is stored encrypted
-- (AES-256-GCM envelope from PersonalDataProtectionService), never as plain text, and is never written to a log.
--
-- One nullable column, no default, no backfill, no index (the comment is never searched). Needs the owner's sign-off before it is
-- applied to production: the table was signed off on 1 October 2026 without a comment column.

ALTER TABLE visit_survey_responses
  ADD COLUMN IF NOT EXISTS comment_protected JSONB NULL;
