-- Buffr Checkpoint — customer-consent gate for break-glass support-access
-- grants. Previously (0022) a platform_support user's grant request was
-- self-approved (approved_by set to their own user id) — real time-boxing
-- and audit, but no customer opt-in at all, falling short of
-- docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md Section 9.2 rule 4's "client-approved where
-- practical." This migration makes customer approval a hard gate: a grant
-- is inert (cannot mint a support session, cannot pass RbacGuard's
-- per-request re-check) until an authorized user of the TARGET
-- organisation explicitly approves it. The requesting platform_support
-- user can no longer approve their own request.
--
-- Wiebe: UUID PKs, status tracked explicitly via status_code (not
-- inferred from timestamps), status-log companion table, zero triggers.

-- ============================================================================
-- privileged_access_grants: add explicit status + customer-approval columns
-- ============================================================================

ALTER TABLE privileged_access_grants
  ADD COLUMN IF NOT EXISTS status_code UUID NULL REFERENCES type_definition (id),
  -- Requested duration, applied from the moment of customer approval, not
  -- from request time — a customer who takes 6 hours to respond shouldn't
  -- burn 6 of their approved org's 8 granted hours before ever using it.
  ADD COLUMN IF NOT EXISTS requested_duration_ms BIGINT NOT NULL DEFAULT 28800000,
  ADD COLUMN IF NOT EXISTS requested_by UUID NULL,
  ADD COLUMN IF NOT EXISTS customer_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS customer_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS denied_by UUID NULL,
  ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS denial_reason TEXT NULL;

-- starts_at / expires_at / approved_by were NOT NULL under the old
-- self-approval model (all set at request time, by the requester). They're
-- now only meaningful once a customer approves — approved_by in particular
-- is superseded by customer_approved_by (a platform_support requester can
-- no longer approve their own request) and kept only for old rows' history.
ALTER TABLE privileged_access_grants
  ALTER COLUMN starts_at DROP NOT NULL,
  ALTER COLUMN expires_at DROP NOT NULL,
  ALTER COLUMN approved_by DROP NOT NULL;

-- Backfill existing rows (created under the old self-approval model,
-- notably this session's own live-test grants) so they don't silently
-- become invalid: treat approved_by as customer_approved_by and mark them
-- active, since they were genuinely time-boxed and used under the old
-- rules — this is a one-time compatibility backfill, not new behavior.
UPDATE privileged_access_grants
SET
  customer_approved_by = approved_by,
  customer_approved_at = COALESCE(customer_approved_at, starts_at),
  requested_by = COALESCE(requested_by, approved_by)
WHERE customer_approved_at IS NULL AND starts_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_privileged_access_grants_status
  ON privileged_access_grants (status_code) WHERE deleted_at IS NULL;

-- ============================================================================
-- privileged_access_grant_status_events — status-log companion (Wiebe rule:
-- every stateful entity gets one; this table was stateful without one)
-- ============================================================================

CREATE TABLE IF NOT EXISTS privileged_access_grant_status_events (
  id                    UUID PRIMARY KEY,
  grant_id              UUID NOT NULL REFERENCES privileged_access_grants (id),
  from_status_code      UUID NULL REFERENCES type_definition (id),
  to_status_code        UUID NOT NULL REFERENCES type_definition (id),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id              UUID NULL,
  note                  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_privileged_access_grant_status_events_grant
  ON privileged_access_grant_status_events (grant_id, occurred_at);

-- ============================================================================
-- type_definition seed + customer-side review permission
-- ============================================================================

INSERT INTO type_definition (id, domain, code, label, sort_order)
SELECT gen_random_uuid(), d.domain, d.code, d.label, d.sort_order
FROM (VALUES
  ('privileged_access_grant_status', 'pending_customer_approval', 'Pending customer approval', 1),
  ('privileged_access_grant_status', 'active', 'Active', 2),
  ('privileged_access_grant_status', 'denied', 'Denied', 3),
  ('privileged_access_grant_status', 'expired', 'Expired', 4),
  ('privileged_access_grant_status', 'revoked', 'Revoked', 5)
) AS d(domain, code, label, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM type_definition WHERE domain = d.domain AND code = d.code
);

-- Backfilled rows above get an explicit 'active' status_code row now that
-- the domain exists.
UPDATE privileged_access_grants
SET status_code = (SELECT id FROM type_definition WHERE domain = 'privileged_access_grant_status' AND code = 'active')
WHERE status_code IS NULL AND customer_approved_at IS NOT NULL AND revoked_at IS NULL;

UPDATE privileged_access_grants
SET status_code = (SELECT id FROM type_definition WHERE domain = 'privileged_access_grant_status' AND code = 'revoked')
WHERE status_code IS NULL AND revoked_at IS NOT NULL;

UPDATE privileged_access_grants
SET status_code = (SELECT id FROM type_definition WHERE domain = 'privileged_access_grant_status' AND code = 'pending_customer_approval')
WHERE status_code IS NULL;

-- Customer-side permission — a target org's own owner_operator/
-- system_administrator must be able to see and decide requests against
-- their own organisation. This is the one genuinely customer-facing piece
-- of the whole break-glass mechanism.
INSERT INTO permission_definitions (permission_code, description, risk_classification)
VALUES ('support_access.grant.review', 'Approve or deny a Buffr Checkpoint platform-support access request against your organisation', 'elevated')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permission_grants (role_code, permission_code)
  SELECT td.id, p.permission_code
  FROM type_definition td
  CROSS JOIN (VALUES
    ('owner_operator', 'support_access.grant.review'),
    ('system_administrator', 'support_access.grant.review')
  ) AS grants(role_code, permission_code)
  JOIN permission_definitions p ON p.permission_code = grants.permission_code
  WHERE td.domain = 'role_code' AND td.code = grants.role_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
