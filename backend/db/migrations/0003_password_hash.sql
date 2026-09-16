-- Buffr Checkpoint — add password_hash to user_account
-- Discovered while implementing real auth business logic: Section 11.4.4's
-- login flow needs a credential to check against, which 0001/0002 never
-- added. bcrypt hash only, never a plaintext password column.
-- STATUS: Approved for Release 1 implementation, 2026-09-09 (owner: George Nekwaya)

ALTER TABLE user_account
  ADD COLUMN password_hash TEXT NULL;
