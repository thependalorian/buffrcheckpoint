import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";

// Renamed `audit_event` -> `audit_events`; `action` -> `action_code`; new
// `request_id` column. Append-only, hash-linked chain — this table IS the
// log, no separate status log.
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    actorId: uuid("actor_id"),
    actionCode: text("action_code").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: uuid("resource_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    requestId: text("request_id"),
    prevEventHash: text("prev_event_hash"),
    eventHash: text("event_hash").notNull(),
  },
  (t) => [index("idx_audit_events_org_occurred").on(t.organisationId, t.occurredAt)],
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
