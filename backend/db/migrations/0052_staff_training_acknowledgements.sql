-- Buffr Checkpoint — staff training evidence (buffrcheckpoint.md v0.33).
--
-- The Staff training checklist step used to complete on a button press with
-- no record behind it. It now requires an acknowledgement row for the acting
-- user. Table design signed off by George (2026-10-05) per CLAUDE.md §2.
--
-- Append-only: no updated_at, UPDATE/DELETE revoked from the runtime role.
-- A new training version is a new row, never an edit. No status log: an
-- acknowledgement has no lifecycle beyond existing.

CREATE TABLE IF NOT EXISTS staff_training_acknowledgements (
  id                     UUID PRIMARY KEY,
  organisation_id        UUID NOT NULL REFERENCES organisations (id),
  user_id                UUID NOT NULL REFERENCES application_users (id),
  role_code              UUID NOT NULL REFERENCES type_definition (id),
  training_version_code  UUID NOT NULL REFERENCES type_definition (id),
  acknowledged_at        TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_training_ack_org_user
  ON staff_training_acknowledgements (organisation_id, user_id, acknowledged_at DESC)
  WHERE deleted_at IS NULL;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'staff_training_version', 'checkpoint_2026_10', 'Checkpoint staff training (October 2026)', 1
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'staff_training_version' AND code = 'checkpoint_2026_10'
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE staff_training_acknowledgements FROM buffr_checkpoint_runtime';
  END IF;
END
$$;
