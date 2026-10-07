-- Buffr Checkpoint — one account per email, case-insensitive (docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md v0.33).
--
-- Login resolves an account by email across all organisations, so the
-- identity is global: this index intentionally does not lead with the tenant
-- column. DTOs normalise to lowercase (@NormaliseEmail). Pre-check on
-- falling-frog-15538162 (2026-10-05): 0 mixed-case rows, 0 duplicate groups.

CREATE UNIQUE INDEX IF NOT EXISTS uq_application_users_email_lower
  ON application_users (lower(email))
  WHERE deleted_at IS NULL;
