import { index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { privilegedAccessGrants } from "./rbac";
import { typeDefinition } from "./type-definitions";

// Platform Ops Console — internal Buffr-staff app, separate from admin/.
// See buffrcheckpoint.md Section 11.9.1. Break-glass "act as org" mechanism:
// a platform_support user mints a session under an active grant, then acts
// in admin/ itself (reused, not rebuilt) under a visible banner.
export const platformSupportSession = pgTable(
  "platform_support_session",
  {
    id: uuid("id").primaryKey(),
    platformUserId: uuid("platform_user_id").notNull(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => privilegedAccessGrants.id),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("idx_platform_support_session_user").on(t.platformUserId, t.expiresAt)],
);

// Append-only. Every write under a support session lands here, never in the
// org's own single-tenant audit_events hash chain.
export const platformSupportAuditEvents = pgTable(
  "platform_support_audit_events",
  {
    id: uuid("id").primaryKey(),
    supportSessionId: uuid("support_session_id")
      .notNull()
      .references(() => platformSupportSession.id),
    platformUserId: uuid("platform_user_id").notNull(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_platform_support_audit_events_org").on(t.organisationId, t.occurredAt)],
);

export const platformIncident = pgTable(
  "platform_incident",
  {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    severityCode: uuid("severity_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    openedBy: uuid("opened_by").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_platform_incident_status").on(t.statusCode)],
);

export const platformIncidentStatusEvents = pgTable(
  "platform_incident_status_events",
  {
    id: uuid("id").primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => platformIncident.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_platform_incident_status_events_incident").on(t.incidentId, t.occurredAt)],
);

export const platformIncidentAffectedOrganisations = pgTable(
  "platform_incident_affected_organisations",
  {
    id: uuid("id").primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => platformIncident.id),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
  },
  (t) => [index("idx_platform_incident_affected_org").on(t.organisationId)],
);

export const supportTicket = pgTable(
  "support_ticket",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id").references(() => organisations.id),
    subject: text("subject").notNull(),
    description: text("description"),
    severityCode: uuid("severity_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    requestedBy: uuid("requested_by"),
    assignedTo: uuid("assigned_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_support_ticket_org").on(t.organisationId), index("idx_support_ticket_status").on(t.statusCode)],
);

export const supportTicketStatusEvents = pgTable(
  "support_ticket_status_events",
  {
    id: uuid("id").primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTicket.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_support_ticket_status_events_ticket").on(t.ticketId, t.occurredAt)],
);

export const supportTicketComments = pgTable(
  "support_ticket_comments",
  {
    id: uuid("id").primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTicket.id),
    authorId: uuid("author_id").notNull(),
    // Who wrote this comment, staff or the organisation itself — added by
    // migration 0028 so the same table carries a two-way thread instead of
    // a separate conversation schema. Every pre-migration row backfilled
    // to 'platform_staff' (the only path that existed to write one then).
    authorTypeCode: uuid("author_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_support_ticket_comments_ticket").on(t.ticketId, t.createdAt)],
);

// Append-only — each row is already a point-in-time log entry, no
// companion status table needed.
export const organisationHealthSnapshot = pgTable(
  "organisation_health_snapshot",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    visitVolumeTrend: numeric("visit_volume_trend", { precision: 6, scale: 3 }),
    adminLoginRecencyDays: integer("admin_login_recency_days"),
    notificationFailureRate: numeric("notification_failure_rate", { precision: 5, scale: 4 }),
    deviceOfflineRate: numeric("device_offline_rate", { precision: 5, scale: 4 }),
    healthScore: numeric("health_score", { precision: 5, scale: 2 }).notNull(),
    churnRiskBandCode: uuid("churn_risk_band_code")
      .notNull()
      .references(() => typeDefinition.id),
  },
  (t) => [
    index("idx_organisation_health_snapshot_org").on(t.organisationId, t.computedAt),
    index("idx_organisation_health_snapshot_band").on(t.churnRiskBandCode, t.computedAt),
  ],
);

export type PlatformSupportSession = typeof platformSupportSession.$inferSelect;
export type NewPlatformSupportSession = typeof platformSupportSession.$inferInsert;
export type PlatformIncident = typeof platformIncident.$inferSelect;
export type SupportTicket = typeof supportTicket.$inferSelect;
export type OrganisationHealthSnapshot = typeof organisationHealthSnapshot.$inferSelect;
export type NewOrganisationHealthSnapshot = typeof organisationHealthSnapshot.$inferInsert;
