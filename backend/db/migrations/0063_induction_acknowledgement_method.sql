-- Contractor induction acknowledged on the contractor's own phone (scan the induction QR, read, tick). The acknowledgement is recorded
-- in visitor_policy_acknowledgements like every other notice; only a new method value is needed, and a value is a config row,
-- not a schema change. Idempotent.

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'acknowledgement_method', 'phone_tap', 'Acknowledged on own phone', 5
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'acknowledgement_method' AND code = 'phone_tap'
);
