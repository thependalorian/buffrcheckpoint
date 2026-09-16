-- Emergency roll-call events are mutable for close-out only (`closed_at`).
-- Migration 0024 revoked UPDATE on them as if they were append-only status
-- logs; resolve() must UPDATE closed_at. Keep DELETE revoked.
-- Entries remain INSERT/SELECT only (snapshot rows).

GRANT UPDATE ON TABLE emergency_roll_call_events TO buffr_checkpoint_runtime;
-- DELETE stays revoked from 0024.
