import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// No `active` boolean — current state is derived from "most recent
// legal_hold_status_events row," matching every other status-log table.
// Log table renamed `legal_hold_status_log` -> `legal_hold_status_events`.
export const legalHolds = pgTable(
  "legal_holds",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    scope: jsonb("scope").notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_legal_holds_org").on(t.organisationId)],
);

export const legalHoldStatusEvents = pgTable(
  "legal_hold_status_events",
  {
    id: uuid("id").primaryKey(),
    legalHoldId: uuid("legal_hold_id")
      .notNull()
      .references(() => legalHolds.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_legal_hold_status_events_hold").on(t.legalHoldId, t.occurredAt)],
);

export type LegalHold = typeof legalHolds.$inferSelect;
export type NewLegalHold = typeof legalHolds.$inferInsert;
