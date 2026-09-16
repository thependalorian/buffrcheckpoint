import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { hostNotificationEscalationPolicyVersions } from "./host-notification-escalation";
import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

/** Append-only — one row per escalation action applied to a visit. */
export const hostNotificationEscalationEvents = pgTable(
  "host_notification_escalation_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    escalationPolicyVersionId: uuid("escalation_policy_version_id")
      .notNull()
      .references(() => hostNotificationEscalationPolicyVersions.id),
    escalationActionCode: uuid("escalation_action_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_host_notification_escalation_events_visit").on(t.visitId, t.occurredAt),
    index("idx_host_notification_escalation_events_org_site").on(t.organisationId, t.siteId, t.occurredAt),
  ],
);
