-- Buffr Checkpoint — real notification outbox + dispatcher worker support
-- notification_delivery_instructions was an outbox-shaped table in name only:
-- the provider call happened synchronously in the request, then this table
-- recorded the already-happened outcome. This migration adds what a real
-- outbox needs — persisted message content, pending/processing states, and
-- retry/backoff bookkeeping — plus a status-log companion table so status
-- transitions are append-only, matching the rest of this schema.
--
-- Wiebe: UUID PKs, organisation_id tenancy, soft deletes, type_definition FKs,
-- status event companions, zero triggers, zero ON DELETE CASCADE.

-- ============================================================================
-- notification_delivery_instructions: add outbox columns
-- ============================================================================

ALTER TABLE notification_delivery_instructions
  ADD COLUMN IF NOT EXISTS subject TEXT NULL,
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS html TEXT NULL,
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_delivery_instructions_dispatch
  ON notification_delivery_instructions (status_code, next_attempt_at)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- notification_delivery_status_events (status-log companion, append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_status_events (
  id                                      UUID PRIMARY KEY,
  notification_delivery_instruction_id    UUID NOT NULL REFERENCES notification_delivery_instructions (id),
  from_status_code                        UUID NULL REFERENCES type_definition (id),
  to_status_code                          UUID NOT NULL REFERENCES type_definition (id),
  occurred_at                             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_code                           TEXT NULL,
  failure_code                            TEXT NULL,
  note                                    TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_status_events_instruction
  ON notification_delivery_status_events (notification_delivery_instruction_id, occurred_at);

-- ============================================================================
-- notification_delivery_status: add pending / processing codes
-- (existing seed only had sent / delivered / failed — an outbox needs a
-- queued state before either of those is known)
-- ============================================================================

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'notification_delivery_status', 'pending', 'Pending dispatch', 0
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'notification_delivery_status' AND code = 'pending'
);

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), 'notification_delivery_status', 'processing', 'Dispatch in progress', 4
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = 'notification_delivery_status' AND code = 'processing'
);
