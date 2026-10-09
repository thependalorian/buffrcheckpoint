-- Account deletion as a workflow, not a flag (blueprint 8.7, standard DL-2, DL-5, DL-7, DL-10). Table design signed off by the owner
-- (2026-10-08). Adds the request statuses and account status as type_definition rows (an INSERT, not a schema change), a per-system task
-- table with its status log, and a recovery tombstone table. No trigger, no cascade, client-generated UUIDs, tenant column first in
-- every index, soft-delete column on mutable rows, status log created with the task table. Additive and idempotent.

BEGIN;

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('dsar_status', 'verifying_identity', 'Verifying identity', 5),
  ('dsar_status', 'on_hold', 'On hold', 6),
  ('dsar_status', 'scheduled', 'Scheduled', 7),
  ('dsar_status', 'in_progress', 'In progress', 8),
  ('dsar_status', 'waiting_for_processors', 'Waiting for processors', 9),
  ('dsar_status', 'partially_completed', 'Partially completed', 10),
  ('dsar_status', 'cancelled', 'Cancelled', 11),
  ('dsar_status', 'failed', 'Failed', 12),
  ('application_user_status', 'active', 'Active', 1),
  ('application_user_status', 'closing', 'Closing: sign-in refused while a deletion request runs', 2),
  ('disposition_system', 'credentials_and_sessions', 'Sign-in credentials, sessions and refresh tokens', 1),
  ('disposition_system', 'application_user_profile', 'Application user profile', 2),
  ('disposition_system', 'notification_outbox', 'Notification outbox', 3),
  ('disposition_system', 'billing_records', 'Billing records and invoices', 4),
  ('disposition_system', 'audit_chain', 'Audit events', 5),
  ('disposition_system', 'processors', 'Providers that processed the account', 6),
  ('disposition_action', 'delete', 'Delete', 1),
  ('disposition_action', 'anonymise', 'Anonymise', 2),
  ('disposition_action', 'retain', 'Retain and restrict', 3),
  ('disposition_action', 'notify_processor', 'Notify processor', 4),
  ('disposition_task_status', 'pending', 'Pending', 1),
  ('disposition_task_status', 'running', 'Running', 2),
  ('disposition_task_status', 'completed', 'Completed', 3),
  ('disposition_task_status', 'retry_scheduled', 'Retry scheduled', 4),
  ('disposition_task_status', 'failed_requires_review', 'Failed, needs review', 5),
  ('disposition_task_status', 'not_applicable', 'Not applicable', 6),
  ('disposition_task_status', 'retained_under_policy', 'Retained under policy', 7),
  ('retention_basis', 'financial_record', 'Financial record kept for the required period', 1),
  ('retention_basis', 'audit_integrity', 'Audit chain integrity', 2),
  ('retention_basis', 'security', 'Security and fraud prevention', 3),
  ('retention_basis', 'dispute', 'Open dispute or legal claim', 4)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code);

CREATE TABLE IF NOT EXISTS data_disposition_task (
  id                    UUID PRIMARY KEY,
  organisation_id       UUID NOT NULL REFERENCES organisations (id),
  request_id            UUID NOT NULL REFERENCES privacy_requests (id),
  system_code           UUID NOT NULL REFERENCES type_definition (id),
  action_code           UUID NOT NULL REFERENCES type_definition (id),
  status_code           UUID NOT NULL REFERENCES type_definition (id),
  retention_basis_code  UUID NULL REFERENCES type_definition (id),
  retention_expires_at  TIMESTAMPTZ NULL,
  idempotency_key       TEXT NOT NULL,
  external_reference    TEXT NULL,
  attempt_count         INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT NULL,
  next_attempt_at       TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_data_disposition_task_key ON data_disposition_task (organisation_id, idempotency_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_disposition_task_request ON data_disposition_task (organisation_id, request_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_disposition_task_due ON data_disposition_task (organisation_id, status_code, next_attempt_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS data_disposition_task_status_log (
  id                UUID PRIMARY KEY,
  organisation_id   UUID NOT NULL REFERENCES organisations (id),
  task_id           UUID NOT NULL REFERENCES data_disposition_task (id),
  from_status_code  UUID NULL REFERENCES type_definition (id),
  to_status_code    UUID NOT NULL REFERENCES type_definition (id),
  reason_code       TEXT NOT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_disposition_task_status_log_task ON data_disposition_task_status_log (organisation_id, task_id, occurred_at);

CREATE TABLE IF NOT EXISTS deletion_recovery_tombstone (
  id               UUID PRIMARY KEY,
  organisation_id  UUID NOT NULL REFERENCES organisations (id),
  request_id       UUID NOT NULL REFERENCES privacy_requests (id),
  subject_hmac     TEXT NOT NULL,
  erased_at        TIMESTAMPTZ NOT NULL,
  replay_until     TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_deletion_recovery_tombstone_request ON deletion_recovery_tombstone (organisation_id, request_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deletion_recovery_tombstone_replay ON deletion_recovery_tombstone (organisation_id, replay_until) WHERE deleted_at IS NULL;

COMMENT ON TABLE data_disposition_task IS 'Internal. One task per system and data category for a deletion request. Idempotent, retried with backoff, reviewed when it fails past the cap.';
COMMENT ON COLUMN data_disposition_task.idempotency_key IS 'Internal. request id plus system code; a repeat run finds the same row.';
COMMENT ON COLUMN data_disposition_task.last_error IS 'Internal. Failure reason without personal data.';
COMMENT ON TABLE data_disposition_task_status_log IS 'Internal. Append-only history of task status changes.';
COMMENT ON TABLE deletion_recovery_tombstone IS 'Restricted. Keyed HMAC of an erased subject, kept until the backup horizon so a restore can replay the erasure. No plaintext identity.';
COMMENT ON COLUMN deletion_recovery_tombstone.subject_hmac IS 'Restricted. HMAC of the internal subject id with a server-held pepper.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON TABLE data_disposition_task_status_log FROM buffr_checkpoint_runtime';
    EXECUTE 'REVOKE DELETE ON TABLE data_disposition_task FROM buffr_checkpoint_runtime';
    EXECUTE 'REVOKE DELETE ON TABLE deletion_recovery_tombstone FROM buffr_checkpoint_runtime';
  END IF;
END
$$;

COMMIT;
