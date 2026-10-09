-- LG-2: 28 of 49 audit events of the Buffr organisation fail their stored hash. Cause, proven by recomputation on 2026-10-09: the
-- 2026-09 demo-organisation unification moved the rows to this organisation id (migration 0057 notes it), and the hash covers
-- organisation_id. All 28 hash correctly under the pre-merge id 47c8b69b-5d9c-499d-a759-debc33e87c5e and under no other id.
-- The pre-merge id is registered as config (code = current organisation id, label = former id). The verifier accepts an event only when
-- its stored hash matches the current id or a registered former id exactly, so an edited event still fails. Idempotent.
BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'audit_chain_former_org_id', 'b51f0704-12a7-45d4-8b0d-3642785b6e77', '47c8b69b-5d9c-499d-a759-debc33e87c5e', 1
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition
  WHERE domain = 'audit_chain_former_org_id' AND code = 'b51f0704-12a7-45d4-8b0d-3642785b6e77'
    AND label = '47c8b69b-5d9c-499d-a759-debc33e87c5e'
);

COMMIT;
