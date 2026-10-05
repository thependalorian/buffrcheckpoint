-- Buffr Checkpoint — least-privilege runtime role, restored on Frankfurt.
--
-- Finding (2026-10-05): the Frankfurt project `falling-frog-15538162` had no
-- `buffr_checkpoint_runtime` role, and the API connected as `neondb_owner`.
-- 0024's Part A was a manual step that was never repeated after the move
-- from Oregon, so every append-only REVOKE since (0024, 0041, 0043-0046,
-- 0048, 0052) was skipped and audit and status-log rows were editable by the
-- application. This migration restores the 0024 design and extends it to
-- every log and event table that exists today.
--
-- Idempotent. The role is created without a password: set one out of band
-- (ALTER ROLE buffr_checkpoint_runtime PASSWORD '...') and point the API's
-- DATABASE_URL at it. Never commit the password. Created with plain SQL so
-- the role is NOT a member of neon_superuser (which would bypass REVOKE).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buffr_checkpoint_runtime') THEN
    CREATE ROLE buffr_checkpoint_runtime LOGIN NOCREATEDB NOCREATEROLE NOSUPERUSER;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE neondb TO buffr_checkpoint_runtime;
GRANT USAGE ON SCHEMA public TO buffr_checkpoint_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO buffr_checkpoint_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO buffr_checkpoint_runtime;
-- Tables created later by the owner (every future migration) get the same grants.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO buffr_checkpoint_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO buffr_checkpoint_runtime;

-- Append-only: logs, status histories, audit and acknowledgement rows are
-- corrected by new rows, never edited (CLAUDE.md §2). Code audit 2026-10-05:
-- no application path UPDATEs or DELETEs any of these tables.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'analytics_etl_run_status_log',
    'anomaly_alert_events',
    'anomaly_alert_status_events',
    'audit_events',
    'contact_enquiry_status_log',
    'credential_status_events',
    'credential_use_events',
    'crm_activity_log',
    'crm_deal_status_events',
    'device_operational_status_log',
    'emergency_roll_call_entries',
    'evidence_pack_status_log',
    'feature_phone_check_in_session_status_log',
    'host_notification_escalation_events',
    'kiosk_privacy_pre_checkin_acknowledgements',
    'legal_hold_status_events',
    'notification_delivery_status_events',
    'organisation_access_review_log',
    'organisation_kyb_status_events',
    'organisation_membership_status_log',
    'organisation_onboarding_status_log',
    'organisation_subscription_addon_status_log',
    'organisation_subscription_site_quantity_log',
    'organisation_subscription_status_events',
    'organisation_unit_status_events',
    'payment_reconciliation_log',
    'platform_configuration_setting_status_log',
    'platform_incident_status_events',
    'platform_notification_template_status_log',
    'platform_support_audit_events',
    'pms_integration_connection_status_log',
    'pms_sync_run_log',
    'privacy_request_status_log',
    'privileged_access_grant_status_events',
    'retention_disposition_run_status_log',
    'scheduled_report_run_status_log',
    'sms_contact_confirmation_events',
    'staff_training_acknowledgements',
    'support_ticket_status_events',
    'visit_invitation_status_events',
    'visit_status_events',
    'visit_survey_response_status_events',
    'visitor_identity_assessments',
    'visitor_policy_acknowledgements',
    'visitor_wait_queue_entry_status_events'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE UPDATE, DELETE ON TABLE %I FROM buffr_checkpoint_runtime', t);
    END IF;
  END LOOP;
END
$$;

-- Emergency roll-call events close out by UPDATE of closed_at (0025); DELETE stays revoked.
REVOKE DELETE ON TABLE emergency_roll_call_events FROM buffr_checkpoint_runtime;
