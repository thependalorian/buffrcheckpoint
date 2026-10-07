-- Buffr Checkpoint — least-privilege app role + append-only enforcement
-- Supersedes the stale table names in `0007_audit_append_only.sql`
-- (which still named pre-Constitution tables and was never applied).
--
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md §11.4.5b / §11.4.7 / §20.2
--
-- Neon pitfall: roles created via Neon Console/API are members of
-- `neon_superuser` and bypass GRANT/REVOKE. Create the runtime role with
-- plain SQL (Part A) so it is NOT in neon_superuser. Verified 2026-09-14:
-- role `buffr_checkpoint_runtime` — audit_events UPDATE=false, INSERT=true;
-- notification_delivery_instructions UPDATE remains true (outbox).
--
-- APPLY ORDER:
--   1. As Neon owner (`neondb_owner`), run Part A once.
--   2. Point Railway / local `DATABASE_URL` at `buffr_checkpoint_runtime`.
--   3. As owner, run Part B (or confirm already applied).
--   4. Verify: has_table_privilege('buffr_checkpoint_runtime','audit_events','UPDATE') = false
--
-- Do NOT revoke UPDATE on `notification_delivery_instructions` — the outbox
-- worker must transition pending → processing → sent/failed.

-- =============================================================================
-- Part A — create role (run as owner; substitute a generated password)
-- =============================================================================
-- CREATE ROLE buffr_checkpoint_runtime LOGIN PASSWORD '<generated>'
--   NOCREATEDB NOCREATEROLE NOSUPERUSER;
-- GRANT CONNECT ON DATABASE neondb TO buffr_checkpoint_runtime;
-- GRANT USAGE ON SCHEMA public TO buffr_checkpoint_runtime;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO buffr_checkpoint_runtime;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO buffr_checkpoint_runtime;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO buffr_checkpoint_runtime;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT USAGE, SELECT ON SEQUENCES TO buffr_checkpoint_runtime;

-- =============================================================================
-- Part B — append-only REVOKE (only meaningful after app connects as the role)
-- =============================================================================

REVOKE UPDATE, DELETE ON TABLE audit_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE visitor_identity_assessments FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE notification_delivery_status_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE visit_status_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE visit_invitation_status_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE credential_status_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE device_operational_status_log FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE organisation_membership_status_log FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE privacy_request_status_log FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE legal_hold_status_events FROM buffr_checkpoint_runtime;
-- emergency_roll_call_events: DELETE only — resolve() UPDATEs closed_at (see 0025).
REVOKE DELETE ON TABLE emergency_roll_call_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE emergency_roll_call_entries FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE host_notification_escalation_events FROM buffr_checkpoint_runtime;
REVOKE UPDATE, DELETE ON TABLE platform_support_audit_events FROM buffr_checkpoint_runtime;
-- INSERT + SELECT remain granted from Part A.
