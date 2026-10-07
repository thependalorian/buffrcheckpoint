import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { siteHosts } from "./hosts";
import { organisationUnits } from "./organisation-units";
import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

/**
 * Reception visitor wait queue — Business Support / Facilities + Operations
 * Operational Services analogue. Distinct from the kiosk offline sync outbox.
 */
export const visitorWaitQueueEntries = pgTable(
  "visitor_wait_queue_entries",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
    hostId: uuid("host_id")
      .notNull()
      .references(() => siteHosts.id),
    organisationUnitId: uuid("organisation_unit_id").references(() => organisationUnits.id),
    queueNumber: integer("queue_number").notNull(),
    positionAtEnqueue: integer("position_at_enqueue").notNull(),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    enqueuedAt: timestamp("enqueued_at", { withTimezone: true }).notNull().defaultNow(),
    calledAt: timestamp("called_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("idx_visitor_wait_queue_visit").on(t.visitId),
    index("idx_visitor_wait_queue_org_site_status").on(t.organisationId, t.siteId, t.statusCode, t.enqueuedAt),
  ],
);

export const visitorWaitQueueEntryStatusEvents = pgTable(
  "visitor_wait_queue_entry_status_events",
  {
    id: uuid("id").primaryKey(),
    queueEntryId: uuid("queue_entry_id")
      .notNull()
      .references(() => visitorWaitQueueEntries.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
  },
  (t) => [index("idx_visitor_wait_queue_entry_status_events_entry").on(t.queueEntryId, t.occurredAt)],
);

export type VisitorWaitQueueEntry = typeof visitorWaitQueueEntries.$inferSelect;
export type NewVisitorWaitQueueEntry = typeof visitorWaitQueueEntries.$inferInsert;
