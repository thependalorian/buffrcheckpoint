-- Buffr Checkpoint — card payments through Adumo Online (Virtual hosted page).
--
-- A card payment is a payment_transaction like a proof-of-payment upload,
-- with payment_method 'card'. It starts at 'initiated' and leaves only through
-- the server-side validation of Adumo's signed response token, which writes
-- the payment_reconciliation_log row (the reconciliation artifact) and marks
-- the invoice paid. No card data is stored: only Adumo's transaction index,
-- the masked PAN (first 6 and last 4) and the processor's result.

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('payment_method', 'card', 'Card (Adumo Online)', 2),
  ('payment_status', 'initiated', 'Card payment started', 0),
  ('payment_status', 'failed', 'Card payment failed', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

ALTER TABLE payment_transaction ADD COLUMN IF NOT EXISTS processor_transaction_index TEXT NULL;
ALTER TABLE payment_transaction ADD COLUMN IF NOT EXISTS processor_status TEXT NULL;
ALTER TABLE payment_transaction ADD COLUMN IF NOT EXISTS processor_result_code TEXT NULL;
ALTER TABLE payment_transaction ADD COLUMN IF NOT EXISTS card_masked_pan TEXT NULL;

-- One processor transaction can settle at most one payment row (redirect and
-- webhook may both arrive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transaction_processor_index
  ON payment_transaction (processor_transaction_index)
  WHERE processor_transaction_index IS NOT NULL;
