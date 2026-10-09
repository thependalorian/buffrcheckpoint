import type { DispositionAction } from "../../modules/dsar/deletion-plan";

/**
 * The data-disposition registry (DL-6, DL-1): every table that holds personal data, which module owns it, the identifier the person is
 * found by, what happens to it when an account or a visitor record is erased, and where the proof is. A new service is not
 * production-ready until its tables are listed here; a test fails when a table with personal-looking columns is missing.
 */
export interface DispositionEntry {
  table: string;
  owner: string;
  /** How the person is found in this table. */
  identifier: string;
  /** What the deletion workflow or the retention worker does with it. */
  action: DispositionAction | "retain_restricted" | "disposed_by_retention";
  evidence: string;
}

export const DATA_DISPOSITION_REGISTRY: DispositionEntry[] = [
  {
    table: "application_users",
    owner: "dsar/account-deletion",
    identifier: "email, user id",
    action: "anonymise",
    evidence: "account-deletion.e2e-spec.ts: email replaced, credentials cleared, row soft-deleted",
  },
  {
    table: "auth_refresh_token",
    owner: "auth/refresh-token",
    identifier: "user id (hash only)",
    action: "delete",
    evidence: "revoked by the credentials task; refresh-token.e2e-spec.ts",
  },
  {
    table: "notification_delivery_instructions",
    owner: "dsar/account-deletion",
    identifier: "recipient reference",
    action: "anonymise",
    evidence: "outbox task overwrites recipient and text; retention worker redacts after 30 days",
  },
  {
    table: "privacy_requests",
    owner: "dsar",
    identifier: "subject reference",
    action: "anonymise",
    evidence: "subject reference replaced with the erased placeholder at profile erasure",
  },
  {
    table: "visitor_personal_data",
    owner: "retention-disposition",
    identifier: "phone and name lookup digests",
    action: "disposed_by_retention",
    evidence: "disposition worker overwrites the envelope and clears digests",
  },
  {
    table: "visitor_visits",
    owner: "retention-disposition",
    identifier: "visitor id, photo reference, notes",
    action: "disposed_by_retention",
    evidence: "disposition worker soft-deletes and clears photo and notes",
  },
  {
    table: "visit_survey_responses",
    owner: "visit-survey",
    identifier: "visit id (comment is an envelope)",
    action: "retain_restricted",
    evidence: "rating survives disposal by design; comment is encrypted",
  },
  {
    table: "contact_enquiries",
    owner: "contact",
    identifier: "sender email",
    action: "retain_restricted",
    evidence: "kept with its status log for the enquiry record; retention period to be set (blueprint 31 item 26)",
  },
  {
    table: "crm_contact",
    owner: "crm",
    identifier: "protected name, email, phone",
    action: "retain_restricted",
    evidence: "protected envelopes; staff-only; period to be set (blueprint 31 item 26)",
  },
  {
    table: "organisation_kyb_verification",
    owner: "kyb",
    identifier: "protected address, signatory, contact",
    action: "retain_restricted",
    evidence: "protected envelopes; follows the verification retention period",
  },
  {
    table: "support_ticket_comments",
    owner: "support-tickets",
    identifier: "author user id, free text",
    action: "retain_restricted",
    evidence: "redaction on closure is a documented gap (blueprint 8.7)",
  },
  {
    table: "sms_contact_confirmation_events",
    owner: "notifications",
    identifier: "keyed hash of the recipient",
    action: "retain_restricted",
    evidence: "holds a keyed hash and a message reference, no number or text",
  },
  {
    table: "site_anomaly_rule_configurations",
    owner: "anomaly-rules",
    identifier: "none (rule settings)",
    action: "retain_restricted",
    evidence: "column name matches only; holds no person",
  },
  {
    table: "host_notification_escalation_policy_versions",
    owner: "host-notification-escalation",
    identifier: "alternate recipient reference",
    action: "retain_restricted",
    evidence: "staff contact reference; follows the policy version history",
  },
  {
    table: "sites",
    owner: "sites",
    identifier: "none (business address)",
    action: "retain_restricted",
    evidence: "a business address, not a person",
  },
  {
    table: "organisations",
    owner: "organisations",
    identifier: "none (legal name of the business)",
    action: "retain_restricted",
    evidence: "a business name, not a person",
  },
  {
    table: "auth_signing_key",
    owner: "auth/token-issuer",
    identifier: "none (platform keys)",
    action: "retain_restricted",
    evidence: "platform keys, no person",
  },
  {
    table: "analytics_etl_run",
    owner: "analytics-etl",
    identifier: "none",
    action: "retain_restricted",
    evidence: "error text only; scrubbed of personal data",
  },
  {
    table: "retention_disposition_run",
    owner: "retention-disposition",
    identifier: "none",
    action: "retain_restricted",
    evidence: "counts and error text only",
  },
  {
    table: "platform_notification_template",
    owner: "platform-configuration",
    identifier: "none (template text)",
    action: "retain_restricted",
    evidence: "templates, no person",
  },
  {
    table: "kiosk_experience_configuration_versions",
    owner: "kiosk-experience",
    identifier: "none (maintenance message)",
    action: "retain_restricted",
    evidence: "configuration text, no person",
  },
  {
    table: "pms_integration_connections",
    owner: "integrations",
    identifier: "none (connection notes)",
    action: "retain_restricted",
    evidence: "operator notes, no visitor data",
  },
  {
    table: "permission_definitions",
    owner: "rbac",
    identifier: "none",
    action: "retain_restricted",
    evidence: "column name matches only",
  },
];
