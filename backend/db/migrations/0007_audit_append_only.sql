-- SUPERSEDED by `0024_app_role_append_only_enforcement.sql` (live Constitution
-- table names). Do not apply this file — the REVOKE targets below still use
-- pre-rename names (`audit_event`, `identity_verification_event`, etc.) and
-- would fail against current Neon.
--
-- Buffr Checkpoint — append-only DB enforcement for hash-chained tables
-- Source of truth: docs/archive/buffrcheckpoint.v0.34-legacy-2026-10-07.md Section 11.4.5 rule 4 / Section 20.2
-- ("audit chain is called immutable"). The prev_event_hash/event_hash chain
-- on audit_event, and the append-only-by-construction design of
-- identity_verification_event, notification_event, and
-- emergency_roster_snapshot, are enforced today only by application code
-- never issuing UPDATE/DELETE against them — nothing in the database stops
-- a bug, a bad migration, or a compromised app credential from forking the
-- chain with a direct UPDATE.
--
-- NOT YET APPLIED — DO NOT RUN AGAINST THE LIVE DATABASE WITHOUT REVIEW.
--
-- This migration is a no-op as written against the current backend/.env
-- connection: the app authenticates as `neondb_owner`, and PostgreSQL table
-- owners bypass GRANT/REVOKE entirely — REVOKE has no effect on the owner
-- of a table. For this to actually enforce anything, the app must first be
-- moved off the owner role onto a dedicated least-privilege role (e.g.
-- `buffr_checkpoint_app`) that owns nothing and is only granted the
-- privileges below. That is a production credential/connection-string
-- change and needs its own sign-off before this migration does anything
-- meaningful — flagged here rather than run silently.
--
-- Prerequisite (run once, as the Neon project owner, not part of this file):
--   CREATE ROLE buffr_checkpoint_app LOGIN PASSWORD '<generated>';
--   GRANT CONNECT ON DATABASE neondb TO buffr_checkpoint_app;
--   GRANT USAGE ON SCHEMA public TO buffr_checkpoint_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO buffr_checkpoint_app;
--   -- then narrow the append-only tables below, and repoint
--   -- backend/.env DATABASE_URL at buffr_checkpoint_app before this file
--   -- has any real effect.

REVOKE UPDATE, DELETE ON audit_event FROM buffr_checkpoint_app;
REVOKE UPDATE, DELETE ON identity_verification_event FROM buffr_checkpoint_app;
REVOKE UPDATE, DELETE ON notification_event FROM buffr_checkpoint_app;
REVOKE UPDATE, DELETE ON emergency_roster_snapshot FROM buffr_checkpoint_app;
-- Explicitly leave INSERT and SELECT granted (append + read only).
