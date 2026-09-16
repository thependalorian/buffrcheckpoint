import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

/**
 * Section 11.9.8.4 — host-notification escalation when no host response within
 * configured wait time. Scoped org → site → visitor category.
 */
export const hostNotificationEscalationPolicies = pgTable(
  "host_notification_escalation_policies",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id").references(() => sites.id),
    visitorCategoryCode: uuid("visitor_category_code").references(() => typeDefinition.id),
    policyName: text("policy_name"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_host_notification_escalation_policies_org").on(t.organisationId, t.siteId)],
);

export const hostNotificationEscalationPolicyVersions = pgTable(
  "host_notification_escalation_policy_versions",
  {
    id: uuid("id").primaryKey(),
    escalationPolicyId: uuid("escalation_policy_id")
      .notNull()
      .references(() => hostNotificationEscalationPolicies.id),
    versionNumber: integer("version_number").notNull(),
    waitSeconds: integer("wait_seconds").notNull().default(300),
    escalationActionCode: uuid("escalation_action_code")
      .notNull()
      .references(() => typeDefinition.id),
    alternateRecipientReference: text("alternate_recipient_reference"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_host_notification_escalation_policy_versions_policy").on(t.escalationPolicyId),
    uniqueIndex("idx_host_notification_escalation_policy_versions_policy_version").on(
      t.escalationPolicyId,
      t.versionNumber,
    ),
  ],
);

export type HostNotificationEscalationPolicy = typeof hostNotificationEscalationPolicies.$inferSelect;
export type HostNotificationEscalationPolicyVersion =
  typeof hostNotificationEscalationPolicyVersions.$inferSelect;
