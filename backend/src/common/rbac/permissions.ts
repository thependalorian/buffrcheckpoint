// Canonical permission codes (Canonical Engineering Constitution §5.1's
// checkpointPermissionCodes, plus three codes it didn't cover — see
// backend/db/seed/0004_canonical_permissions.sql for the full catalogue
// and role grants). This file is now just the compile-time constant list;
// the actual role -> permission mapping lives in permission_definitions /
// role_permission_grants and is evaluated by
// ScopedPermissionEvaluationService (common/access-control/), not here.

export const PERMISSIONS = {
  VISIT_READ_OWN: "visit.hosted.read_own",
  VISIT_READ_SITE: "visit.roster.read_live",
  VISIT_READ_ORG: "visit.history.read",
  VISIT_WRITE: "visit.arrival.record",
  VISIT_CHECKOUT: "visit.departure.record",
  HOST_APPROVE: "visit.access.approve",
  SITE_CONFIGURE: "site.configure",
  DEVICE_MANAGE: "device.provision",
  RETENTION_CONFIGURE: "retention.configure",
  DSAR_MANAGE: "visitor.data_request.manage",
  LEGAL_HOLD_MANAGE: "legal_hold.manage",
  AUDIT_READ: "audit_log.read",
  EVIDENCE_EXPORT: "evidence_pack.generate",
  ROLE_MANAGE: "role.assign",
  USER_MANAGE: "membership.manage",
  SUPPORT_BREAK_GLASS: "platform.support.break_glass",
  CAPABILITY_STATUS_MANAGE: "integration.configure",
  ORGANISATION_MANAGE: "organisation.provision",
  // Kiosk NFC fast lane (Buffr Checkpoint kiosk plan, "Addition A") — see
  // backend/db/seed/0006_kiosk_permissions.sql for role grants.
  CREDENTIAL_VALIDATE: "credential.validate",
  // Platform Ops Console (internal, platform_support-only) — see
  // backend/db/migrations/0022_platform_ops_console.sql for role grants.
  PLATFORM_DASHBOARD_READ: "platform.dashboard.read",
  // Analytics ETL backfills — db/migrations/0041_analytics_etl.sql.
  PLATFORM_ANALYTICS_MANAGE: "platform.analytics.manage",
  // Retention disposition runs — db/migrations/0043_retention_disposition.sql.
  PLATFORM_RETENTION_MANAGE: "platform.retention.manage",
  PLATFORM_ORG_HEALTH_READ: "platform.org_health.read",
  PLATFORM_INCIDENT_MANAGE: "platform.incident.manage",
  PLATFORM_TICKET_MANAGE: "platform.ticket.manage",
  PLATFORM_SUPPORT_SESSION_REQUEST: "platform.support_session.request",
  PLATFORM_SUPPORT_SESSION_MINT: "platform.support_session.mint",
  PLATFORM_BILLING_MANAGE: "platform.billing.manage",
  PLATFORM_CRM_MANAGE: "platform.crm.manage",
  PLATFORM_KYB_REVIEW: "platform.kyb.review",
  // Platform staff administration and platform-wide config (notification
  // templates, health-score weights) — see db/migrations/0029.
  PLATFORM_STAFF_MANAGE: "platform.staff.manage",
  PLATFORM_CONFIGURATION_MANAGE: "platform.configuration.manage",
  // Staff writes against a customer's device/site compliance record from the
  // console. Separate from the customer-side DEVICE_MANAGE code: this one is
  // exercised through a support grant against someone else's tenant.
  PLATFORM_DEVICE_MANAGE: "platform.device.manage",
  // Customer-side — an org's own owner_operator/system_administrator
  // approving or denying a break-glass support-access request against
  // their own organisation. See db/migrations/0023_support_access_customer_consent.sql.
  SUPPORT_ACCESS_GRANT_REVIEW: "support_access.grant.review",
  // Customer-side codes added by 0029. Both of these paths previously rode
  // on VISIT_READ_ORG ("visit.history.read"), a broad reporting permission
  // every read-only role holds — submitting KYB and opening support tickets
  // are not reporting reads.
  ORGANISATION_KYB_SUBMIT: "organisation.kyb.submit",
  SUPPORT_TICKET_CUSTOMER_MANAGE: "support_ticket.customer.manage",
  ACCESS_REVIEW_MANAGE: "access_review.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
