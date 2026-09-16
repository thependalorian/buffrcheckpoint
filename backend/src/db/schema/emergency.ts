import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { visitorVisits } from "./visits";

// Renamed `emergency_event`/`emergency_roster_snapshot` ->
// `emergency_roll_call_events`/`emergency_roll_call_entries`.
export const emergencyRollCallEvents = pgTable(
  "emergency_roll_call_events",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    activatedBy: uuid("activated_by"),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_emergency_roll_call_events_org_site").on(t.organisationId, t.siteId)],
);

export const emergencyRollCallEntries = pgTable(
  "emergency_roll_call_entries",
  {
    id: uuid("id").primaryKey(),
    rollCallEventId: uuid("roll_call_event_id")
      .notNull()
      .references(() => emergencyRollCallEvents.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_emergency_roll_call_entries_event").on(t.rollCallEventId)],
);

export type EmergencyRollCallEvent = typeof emergencyRollCallEvents.$inferSelect;
export type NewEmergencyRollCallEvent = typeof emergencyRollCallEvents.$inferInsert;
