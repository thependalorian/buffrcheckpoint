-- Buffr Checkpoint — auth extensions (email verification, password reset)
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md, Section 11.4.4/11.4.5
-- STATUS: Approved for Release 1 implementation, 2026-09-09 (owner: George Nekwaya)
-- Follows the same Wiebe schema-design rules as 0001_release1_init.sql.

ALTER TABLE user_account
  ADD COLUMN email_verified_at TIMESTAMPTZ NULL;

-- Single-use, short-lived security token — deleted (not soft-deleted) once
-- consumed or expired, per Section 11.4.5's note that rule 7's soft-delete
-- convention is for operational records, not security tokens.
CREATE TABLE password_reset_token (
  id           UUID PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES user_account (id),
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ NULL
);

CREATE INDEX idx_password_reset_token_user
  ON password_reset_token (user_id);
CREATE UNIQUE INDEX idx_password_reset_token_hash
  ON password_reset_token (token_hash);
