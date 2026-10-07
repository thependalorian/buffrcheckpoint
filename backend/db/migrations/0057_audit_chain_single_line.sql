-- 0057: an organisation's audit chain can no longer fork. Two events may not share a previous hash, and an organisation has only
-- one first event. appendAuditEvent re-reads the tip and retries when it loses the race.
--
-- The index starts at 2026-10-07: earlier history already holds a few forks (concurrent writes before this fix) and one merged
-- chain (the 2026-09 demo-organisation unification changed organisation_id on existing events, which the hash covers). Append-only
-- history is not rewritten; chain checks report breaks before the cutoff separately (scripts/compliance/collect-evidence.mjs).
-- Apply AFTER the API with the retry is deployed.

CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_events_org_prev_hash
  ON audit_events (organisation_id, prev_event_hash)
  WHERE prev_event_hash IS NOT NULL AND occurred_at >= TIMESTAMPTZ '2026-10-07 00:00:00+00';

CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_events_org_first
  ON audit_events (organisation_id)
  WHERE prev_event_hash IS NULL AND occurred_at >= TIMESTAMPTZ '2026-10-07 00:00:00+00';
