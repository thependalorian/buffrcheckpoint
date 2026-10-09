-- A token issued before a credential change must stop working (older tokens are refused by comparing the token's issue time with this
-- column). Set when a password is reset, a role changes, or a deletion request is accepted. Additive and idempotent; no data is rewritten.

BEGIN;

ALTER TABLE application_users ADD COLUMN IF NOT EXISTS credentials_changed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN application_users.credentials_changed_at IS
  'Internal. When the password, role or access of this user last changed; tokens issued earlier are refused.';

COMMIT;
