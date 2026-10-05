import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Config-over-code: a role_code's permission set now lives in these two
// tables instead of a hardcoded TS map (ScopedPermissionEvaluationService
// reads them), matching this workspace's own type_definition pattern.
export const permissionDefinitions = pgTable("permission_definitions", {
  permissionCode: text("permission_code").primaryKey(),
  description: text("description").notNull(),
  riskClassification: text("risk_classification").notNull().default("standard"),
});

// Renamed `role` -> `role_definitions`.
export const roleDefinitions = pgTable(
  "role_definitions",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    roleCode: uuid("role_code")
      .notNull()
      .references(() => typeDefinition.id),
    roleLabel: text("role_label").notNull(),
    isSystemRole: boolean("is_system_role").notNull().default(false),
    requiresMfa: boolean("requires_mfa").notNull().default(false),
    requiresVerifiedEmail: boolean("requires_verified_email").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_role_definitions_org").on(t.organisationId)],
);

// Global, seeded per role_code — a role_code's permission set is config
// data, same pattern as type_definition itself, not duplicated per org.
export const rolePermissionGrants = pgTable(
  "role_permission_grants",
  {
    roleCode: uuid("role_code")
      .notNull()
      .references(() => typeDefinition.id),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissionDefinitions.permissionCode),
  },
  (t) => [primaryKey({ columns: [t.roleCode, t.permissionCode] })],
);

// Renamed `user_account` -> `application_users`.
export const applicationUsers = pgTable(
  "application_users",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    email: text("email").notNull(),
    passwordHash: text("password_hash"), // bcrypt hash only, never plaintext
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecretReference: text("mfa_secret_reference"),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    /** Consecutive / windowed failed password attempts; reset on success. */
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    /** When set and in the future, password login is rejected until expiry (or reset). */
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastFailedLoginAt: timestamp("last_failed_login_at", { withTimezone: true }),
    // Ops Console health-score signal ("admin login recency").
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("idx_application_users_org_email").on(t.organisationId, t.email)],
);

// Renamed `password_reset_token` -> `password_reset_tokens`. Single-use,
// short-lived — deleted (not soft-deleted) once consumed or expired.
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => applicationUsers.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_password_reset_tokens_user").on(t.userId),
    uniqueIndex("idx_password_reset_tokens_hash").on(t.tokenHash),
  ],
);

// Renamed `support_access_grant` -> `privileged_access_grants`. Buffr
// Checkpoint's own Platform Support role, never customer-side.
//
// Customer-consent gate (v0.24, buffrcheckpoint.md Section 9.2 rule 4's
// "client-approved where practical" — previously self-approved by the
// requester, which satisfied time-boxing/audit but not consent at all): a
// grant is created `pending_customer_approval` and inert — it cannot mint
// a support session and RbacGuard's per-request re-check rejects it —
// until an authorized user of the TARGET organisation (owner_operator/
// system_administrator, via `support_access.grant.review`) approves it.
// starts_at/expires_at are set at approval time, not request time, so a
// slow customer response doesn't burn into the approved window.
export const privilegedAccessGrants = pgTable(
  "privileged_access_grants",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    grantedToUserId: uuid("granted_to_user_id").notNull(),
    reasonCode: uuid("reason_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    requestedDurationMs: bigint("requested_duration_ms", { mode: "number" })
      .notNull()
      .default(8 * 60 * 60 * 1000),
    requestedBy: uuid("requested_by"),
    /** @deprecated superseded by customerApprovedBy — kept for rows created before the consent gate existed. */
    approvedBy: uuid("approved_by"),
    customerApprovedBy: uuid("customer_approved_by"),
    customerApprovedAt: timestamp("customer_approved_at", { withTimezone: true }),
    deniedBy: uuid("denied_by"),
    deniedAt: timestamp("denied_at", { withTimezone: true }),
    denialReason: text("denial_reason"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_privileged_access_grants_org").on(t.organisationId),
    index("idx_privileged_access_grants_status").on(t.statusCode),
  ],
);

export const privilegedAccessGrantStatusEvents = pgTable(
  "privileged_access_grant_status_events",
  {
    id: uuid("id").primaryKey(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => privilegedAccessGrants.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_privileged_access_grant_status_events_grant").on(t.grantId, t.occurredAt)],
);

// Renamed `role_assignment` -> `organisation_memberships`.
export const organisationMemberships = pgTable(
  "organisation_memberships",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => applicationUsers.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roleDefinitions.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignmentEventTypeCode: uuid("assignment_event_type_code")
      .notNull()
      .references(() => typeDefinition.id), // 'initial' | 'change'
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_organisation_memberships_org_user").on(t.organisationId, t.userId)],
);

// New: a membership's scope (organisation/region/site), derived 1:1 from
// the prior role_assignment.site_id column during migration 0008.
export const membershipScopes = pgTable(
  "membership_scopes",
  {
    id: uuid("id").primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => organisationMemberships.id),
    scopeType: text("scope_type").notNull(), // 'organisation' | 'region' | 'site'
    scopeId: uuid("scope_id"),
  },
  (t) => [index("idx_membership_scopes_membership").on(t.membershipId)],
);

// Renamed `role_assignment_status_log` -> `organisation_membership_status_log`.
// Only written when assignmentEventTypeCode = 'change'.
export const organisationMembershipStatusLog = pgTable(
  "organisation_membership_status_log",
  {
    id: uuid("id").primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => organisationMemberships.id),
    eventTypeCode: uuid("event_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    approvedBy: uuid("approved_by"),
    reason: text("reason"),
  },
  (t) => [index("idx_org_membership_status_log_membership").on(t.membershipId, t.occurredAt)],
);

export type PermissionDefinition = typeof permissionDefinitions.$inferSelect;
export type RoleDefinition = typeof roleDefinitions.$inferSelect;
export type ApplicationUser = typeof applicationUsers.$inferSelect;
export type NewApplicationUser = typeof applicationUsers.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type OrganisationMembership = typeof organisationMemberships.$inferSelect;
export type NewOrganisationMembership = typeof organisationMemberships.$inferInsert;
