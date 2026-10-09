-- DOC-1: every table carries a comment stating its family and data class. The text is derived from the table family and name, then
-- hand-edited where a table needs more. Restricted tables are the ones listed in the data-disposition registry that hold a person.
-- Idempotent: a comment is replaced by the same text.

DO $$
DECLARE
  r record;
  family text;
  class text;
BEGIN
  FOR r IN SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'r' AND obj_description(c.oid, 'pg_class') IS NULL LOOP
    family := CASE
      WHEN r.t ~ '^(auth_|application_users|email_verification|password_reset|mfa_|organisation_memberships|membership_scopes|privileged_access|organisation_access_review)' THEN 'Sign-in, tokens and access'
      WHEN r.t ~ '^(visitor_|visit_|check_in_|kiosk_privacy|site_hosts|site_checkin|invitation)' THEN 'Visitors and visits'
      WHEN r.t ~ '^(audit_|platform_support)' THEN 'Audit'
      WHEN r.t ~ '^(notification_|sms_|telecom|platform_notification|scheduled_report|contact_enquir)' THEN 'Messaging and reports'
      WHEN r.t ~ '^(invoice|payment_|organisation_subscription|subscription_)' THEN 'Billing'
      WHEN r.t ~ '^(privacy_|legal_hold|retention_|data_disposition|deletion_|evidence_|staff_training)' THEN 'Privacy, retention and evidence'
      WHEN r.t ~ '^(analytics_|anomaly_|site_anomaly|organisation_health)' THEN 'Analytics and alerts'
      WHEN r.t ~ '^(credential|reader_|emergency_|managed_kiosk|device_|host_notification|site_qr|site_notice|access_policy|kiosk_)' THEN 'Devices, credentials and emergency'
      WHEN r.t ~ '^(platform_incident|support_ticket|crm_|organisation_kyb|platform_capability|organisation_capability|pms_|organisation_onboarding)' THEN 'Platform operations and verification'
      WHEN r.t ~ '^(organisation|sites|security_zones|regions|role_|permission_|type_definition|platform_configuration)' THEN 'Organisations, sites and configuration'
      ELSE 'Product data'
    END;
    class := CASE
      WHEN r.t IN ('application_users','auth_refresh_token','notification_delivery_instructions','privacy_requests','visitor_personal_data',
                   'visitor_visits','visit_survey_responses','contact_enquiries','crm_contact','organisation_kyb_verification',
                   'organisation_kyb_document','support_ticket_comments','site_hosts','visitor_subjects','deletion_recovery_tombstone') THEN 'Restricted'
      ELSE 'Internal'
    END;
    EXECUTE format('COMMENT ON TABLE %I IS %L', r.t,
      family || ': ' || replace(r.t, '_', ' ') || '.' ||
      CASE WHEN r.t ~ '(_log|_events)$' THEN ' Append-only history.' ELSE '' END ||
      ' Class: ' || class || '.');
  END LOOP;
END
$$;
