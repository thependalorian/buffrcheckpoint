import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Generation is stateful (pending -> generating -> ready|failed), unlike the
// append-only tables elsewhere in this schema.
export const evidencePack = pgTable(
  "evidence_pack",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    requestedBy: uuid("requested_by").notNull(),
    scope: jsonb("scope").notNull().default({}),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    fileReference: text("file_reference"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_evidence_pack_org").on(t.organisationId)],
);

export const evidencePackStatusLog = pgTable(
  "evidence_pack_status_log",
  {
    id: uuid("id").primaryKey(),
    evidencePackId: uuid("evidence_pack_id")
      .notNull()
      .references(() => evidencePack.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_evidence_pack_status_log_pack").on(t.evidencePackId, t.occurredAt)],
);

export type EvidencePack = typeof evidencePack.$inferSelect;
export type NewEvidencePack = typeof evidencePack.$inferInsert;
