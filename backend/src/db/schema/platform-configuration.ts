import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { applicationUsers, organisationMemberships } from "./rbac";
import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Platform-wide operational config (migration 0029). Same tenancy exception
// as platform_incident / platform_capability_status: the copy and the
// scoring weights are Buffr's, not a per-tenant setting.

/**
 * Editable subject/body for the notification templates the backend actually
 * sends. `body` carries `{{placeholder}}` tokens rendered in application
 * code (PlatformNotificationTemplateService.render) — never a template
 * engine in the database.
 */
export const platformNotificationTemplate = pgTable(
  "platform_notification_template",
  {
    id: uuid("id").primaryKey(),
    templateCode: uuid("template_code")
      .notNull()
      .references(() => typeDefinition.id),
    channelCode: uuid("channel_code")
      .notNull()
      .references(() => typeDefinition.id),
    subject: text("subject"),
    body: text("body").notNull(),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("idx_platform_notification_template_code").on(t.templateCode, t.channelCode)],
);

// Append-only — no updatedAt, never UPDATEd. A correction is a new row.
export const platformNotificationTemplateStatusLog = pgTable(
  "platform_notification_template_status_log",
  {
    id: uuid("id").primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => platformNotificationTemplate.id),
    eventTypeCode: uuid("event_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    note: text("note"),
  },
  (t) => [index("idx_platform_notification_template_status_log_template").on(t.templateId, t.occurredAt)],
);

/**
 * Audited JSONB config rows keyed by `settingKey`. First consumer is
 * `organisation_health_score_weights`, read by
 * organisation-health.service.ts instead of the private constants that
 * used to live in its scoreFrom().
 */
export const platformConfigurationSetting = pgTable(
  "platform_configuration_setting",
  {
    id: uuid("id").primaryKey(),
    settingKey: text("setting_key").notNull(),
    settingValue: jsonb("setting_value").notNull(),
    description: text("description"),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("idx_platform_configuration_setting_key").on(t.settingKey)],
);

export const platformConfigurationSettingStatusLog = pgTable(
  "platform_configuration_setting_status_log",
  {
    id: uuid("id").primaryKey(),
    settingId: uuid("setting_id")
      .notNull()
      .references(() => platformConfigurationSetting.id),
    eventTypeCode: uuid("event_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value"),
    note: text("note"),
  },
  (t) => [index("idx_platform_configuration_setting_status_log_setting").on(t.settingId, t.occurredAt)],
);

/**
 * Customer-side access review (admin/'s Roles > Access reviews tab).
 * Append-only by construction, exactly like organisation_health_snapshot —
 * each row is a point-in-time attestation, so no soft delete and no
 * companion status table. Re-attesting writes another row.
 */
export const organisationAccessReviewLog = pgTable(
  "organisation_access_review_log",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    membershipId: uuid("membership_id").references(() => organisationMemberships.id),
    reviewedUserId: uuid("reviewed_user_id")
      .notNull()
      .references(() => applicationUsers.id),
    reviewedRoleCode: uuid("reviewed_role_code").references(() => typeDefinition.id),
    outcomeCode: uuid("outcome_code")
      .notNull()
      .references(() => typeDefinition.id),
    reviewerId: uuid("reviewer_id").notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_organisation_access_review_log_org").on(t.organisationId, t.occurredAt),
    index("idx_organisation_access_review_log_user").on(t.reviewedUserId, t.occurredAt),
  ],
);

export type PlatformNotificationTemplate = typeof platformNotificationTemplate.$inferSelect;
export type PlatformConfigurationSetting = typeof platformConfigurationSetting.$inferSelect;
export type OrganisationAccessReviewLog = typeof organisationAccessReviewLog.$inferSelect;
