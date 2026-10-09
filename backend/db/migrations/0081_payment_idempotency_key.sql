-- MP-1: the client sends an idempotency key and the server enforces it, so a retried payment request never creates a second payment.
-- Additive: one nullable column and a partial unique index (tenant column first). Idempotent.
BEGIN;

ALTER TABLE payment_transaction ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transaction_org_idempotency_key
  ON payment_transaction (organisation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN payment_transaction.idempotency_key IS
  'Internal. Client-chosen key, unique per organisation, that makes a retried payment request return the first result instead of a second payment.';

COMMIT;
