-- LG-1: lists every log, event or ledger table on which the application role can still UPDATE, DELETE or TRUNCATE.
-- Expected result: zero rows. Documented exceptions: emergency_roll_call_events (closing a roll call sets closed_at) and
-- visit_form_answers (retention disposition overwrites answers). Run as any role that can read the catalogue:
--   psql -tA -f backend/db/maintenance/append-only-grant-violations.sql
SELECT c.relname || ' ' || p.priv AS violation
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('UPDATE'), ('DELETE'), ('TRUNCATE')) AS p(priv)
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND (
    c.relname ~ '(_status_log|_status_events|_use_events)$'
    OR c.relname IN (
      'audit_events', 'platform_support_audit_events', 'emergency_roll_call_entries', 'anomaly_alert_events',
      'sms_contact_confirmation_events', 'host_notification_escalation_events', 'invoice_credit_note',
      'payment_reconciliation_log', 'crm_activity_log', 'visitor_policy_acknowledgements',
      'kiosk_privacy_pre_checkin_acknowledgements', 'staff_training_acknowledgements'
    )
  )
  AND c.relname NOT IN ('emergency_roll_call_events', 'visit_form_answers')
  AND has_table_privilege('buffr_checkpoint_runtime', c.oid, p.priv)
ORDER BY 1;
