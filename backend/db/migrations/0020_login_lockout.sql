-- Per-account login cooldown (FR account security / Gap 8.4 style).
-- 3 failed password attempts within 5 minutes → locked_until = now + 5 minutes.
-- Cleared on successful login or password-reset confirm.

ALTER TABLE application_users
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_application_users_locked_until
  ON application_users (locked_until)
  WHERE locked_until IS NOT NULL AND deleted_at IS NULL;
