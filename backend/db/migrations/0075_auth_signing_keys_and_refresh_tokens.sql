-- Asymmetric token signing keys (SE-1) and rotating refresh tokens with chain revocation (SE-2). Table design signed off by the owner
-- (2026-10-08). Both tables follow the schema rules: client-generated UUIDs, status codes in type_definition, a status log created with
-- each table, no trigger, no cascade, soft delete column, tenant column first in every index where the row belongs to an organisation.
--
-- auth_signing_key is platform-wide (one key set for the whole API, like platform_capability_approvals), so it has no tenant column.
-- The private key is stored only as an AES-256-GCM envelope; the public key is published at /.well-known/jwks.json.
-- Refresh tokens are stored only as a SHA-256 hash of 32 random bytes. A used token presented again revokes its whole family.
-- Additive and idempotent.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('signing_key_status', 'active', 'Signs new tokens', 1),
  ('signing_key_status', 'retiring', 'No longer signs; still verifies tokens already issued', 2),
  ('signing_key_status', 'retired', 'Neither signs nor verifies', 3),
  ('signing_key_algorithm', 'EdDSA', 'EdDSA over Ed25519', 1),
  ('refresh_token_status', 'active', 'Can be exchanged once for a new token', 1),
  ('refresh_token_status', 'used', 'Already exchanged; presenting it again revokes the family', 2),
  ('refresh_token_status', 'revoked', 'Refused', 3),
  ('refresh_token_status', 'expired', 'Past its expiry', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

CREATE TABLE IF NOT EXISTS auth_signing_key (
  id                    UUID PRIMARY KEY,
  kid                   TEXT NOT NULL,
  algorithm_code        UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  public_jwk            JSONB NOT NULL,
  private_key_envelope  TEXT NOT NULL,
  verify_until          TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_signing_key_kid ON auth_signing_key (kid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_signing_key_status ON auth_signing_key (status_code, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_signing_key_status_log (
  id               UUID PRIMARY KEY,
  signing_key_id   UUID NOT NULL REFERENCES auth_signing_key (id),
  from_status_code UUID NULL REFERENCES type_definition (id),
  to_status_code   UUID NOT NULL REFERENCES type_definition (id),
  reason_code      TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_signing_key_status_log_key ON auth_signing_key_status_log (signing_key_id, occurred_at);

CREATE TABLE IF NOT EXISTS auth_refresh_token (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  user_id          UUID NOT NULL REFERENCES application_users (id),
  family_id        UUID NOT NULL,
  token_hash       TEXT NOT NULL,
  status_code      UUID NOT NULL REFERENCES type_definition (id),
  issued_at        TIMESTAMPTZ NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  replaced_by_id   UUID NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_refresh_token_hash ON auth_refresh_token (organisation_id, token_hash) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_family ON auth_refresh_token (organisation_id, family_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_user ON auth_refresh_token (organisation_id, user_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_refresh_token_status_log (
  id                UUID PRIMARY KEY,
  organisation_id   UUID NOT NULL REFERENCES organisations (id),
  refresh_token_id  UUID NOT NULL REFERENCES auth_refresh_token (id),
  from_status_code  UUID NULL REFERENCES type_definition (id),
  to_status_code    UUID NOT NULL REFERENCES type_definition (id),
  reason_code       TEXT NOT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_status_log_token ON auth_refresh_token_status_log (organisation_id, refresh_token_id, occurred_at);

COMMENT ON TABLE auth_signing_key IS 'Restricted. One row per token signing key. Platform-wide, no tenant column. Private key held only as an AES-256-GCM envelope.';
COMMENT ON COLUMN auth_signing_key.kid IS 'Public. Key identifier placed in the token header and in the published key set.';
COMMENT ON COLUMN auth_signing_key.public_jwk IS 'Public. The public half, published at /.well-known/jwks.json.';
COMMENT ON COLUMN auth_signing_key.private_key_envelope IS 'Restricted. Private key encrypted with AES-256-GCM; never logged or returned.';
COMMENT ON COLUMN auth_signing_key.verify_until IS 'Internal. End of the overlap during which a retiring key still verifies tokens.';
COMMENT ON TABLE auth_signing_key_status_log IS 'Internal. Append-only history of signing key status changes.';
COMMENT ON TABLE auth_refresh_token IS 'Restricted. One row per refresh token, stored as a hash. A used token presented again revokes its family.';
COMMENT ON COLUMN auth_refresh_token.token_hash IS 'Restricted. SHA-256 of 32 random bytes; the raw token is never stored.';
COMMENT ON COLUMN auth_refresh_token.family_id IS 'Internal. All tokens descended from one sign-in share a family.';
COMMENT ON TABLE auth_refresh_token_status_log IS 'Internal. Append-only history of refresh token status changes.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE auth_signing_key_status_log FROM buffr_checkpoint_runtime';
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE auth_refresh_token_status_log FROM buffr_checkpoint_runtime';
    EXECUTE 'REVOKE DELETE ON TABLE auth_signing_key FROM buffr_checkpoint_runtime';
    EXECUTE 'REVOKE DELETE ON TABLE auth_refresh_token FROM buffr_checkpoint_runtime';
  END IF;
END
$$;

COMMIT;
