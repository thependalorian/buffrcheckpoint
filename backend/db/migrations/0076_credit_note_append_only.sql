-- Credit notes are immutable: a correction is a new row (blueprint 11.2, standard LG-1 and MP-2). The runtime role still held UPDATE and
-- DELETE on invoice_credit_note from the default privileges. No application path updates or deletes a credit note (checked in code),
-- so the grants are removed. Additive in effect and idempotent.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE invoice_credit_note FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
