-- LG-2: the daily chain verifier reported a break every run for two organisations whose chains forked before the unique predecessor
-- index took effect (0057, 2026-10-07): concurrent writes at organisation creation. History is append-only and is not rewritten.
-- Each side branch or second root is registered here as config (domain audit_chain_legacy_fork, code = audit event id) so the verifier
-- still checks every hash on both branches and refuses any new fork, but does not alert on a fork that cannot be undone.
-- Adding a row is an INSERT, never a code change. Idempotent.
BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('audit_chain_legacy_fork', 'c7ed251d-370f-4a12-96c3-48e16ccdf3fd', 'Pre-index fork 2026-10-05: user registration raced the organisation update on one predecessor', 1),
  ('audit_chain_legacy_fork', 'db27c93f-3f59-4869-a849-a3e260df4d4e', 'Pre-index fork 2026-09-10: user registration raced the first support grant on the organisation creation event', 2),
  ('audit_chain_legacy_fork', '14dee9be-8a14-492b-8126-56f317013792', 'Pre-index second chain root 2026-09-11: organisation creation recorded twice for one organisation', 3),
  ('audit_chain_legacy_fork', 'd9c56a7b-c401-4782-bc92-834efde93f09', 'Pre-index fork 2026-09-11: user registration raced the branding profile on the second root', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

COMMIT;
