-- Owner decision 2026-10-08: business verification requires proof of BIPA registration, who the owners are, a bank confirmation letter,
-- a passport or identity document for each owner and proof of address (lease agreement or utility bill). Good standing is not required.
-- Additive and idempotent: one new document type, and clearer labels on two existing ones. The required set itself lives in code and the
-- kyb_rules setting, not in a table.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('kyb_document_type', 'bank_confirmation_letter', 'Bank confirmation letter', 12)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

UPDATE type_definition SET label = 'Passport or identity document of an owner'
WHERE domain = 'kyb_document_type' AND code = 'certified_id_copy' AND label <> 'Passport or identity document of an owner';

UPDATE type_definition SET label = 'Proof of address (lease agreement or utility bill)'
WHERE domain = 'kyb_document_type' AND code = 'proof_of_address' AND label <> 'Proof of address (lease agreement or utility bill)';

COMMIT;
