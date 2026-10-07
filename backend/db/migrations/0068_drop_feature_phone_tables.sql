-- 0068: drop the feature-phone (USSD) session tables.
--
-- USSD was retired on 2026-10-07 (see 0067) and the owner asked for the tables to be dropped. Nothing reads or writes them: the webhook,
-- the session service and their TypeScript definitions are gone. DESTRUCTIVE and forward-only: the rows are lost. Rollback is a Neon
-- point-in-time restore or the branch taken before the rollout. The status log goes first because it references the sessions table.
--
-- Idempotent (IF EXISTS), one transaction. No trigger, no cascade: both tables are named and dropped explicitly.

BEGIN;

DROP TABLE IF EXISTS feature_phone_check_in_session_status_log;
DROP TABLE IF EXISTS feature_phone_check_in_sessions;

COMMIT;
