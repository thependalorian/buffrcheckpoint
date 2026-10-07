-- 0058: link a Checkpoint user to their Buffr ID account (the OIDC subject). Additive and nullable: existing users keep working
-- through the legacy sign-in until each one signs in with Buffr ID once. Checkpoint keeps its own roles, organisations and
-- onboarding state; Buffr ID proves only who the person is (BUFFR_ID_AND_DOMAINS.md Part B 12.2).
ALTER TABLE application_users ADD COLUMN IF NOT EXISTS buffr_id_subject TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_application_users_buffr_id_subject
  ON application_users (buffr_id_subject)
  WHERE buffr_id_subject IS NOT NULL AND deleted_at IS NULL;
