import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Admin-seeded config table — the one documented exception to client-generated
// UUID PKs (buffrcheckpoint.md Section 11.4.5, Wiebe rule 1): never written by
// a user-facing request path, so a server-side default is fine here.
export const typeDefinition = pgTable(
  "type_definition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    domain: text("domain").notNull(),
    code: text("code").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("idx_type_definition_domain_code").on(t.domain, t.code)],
);

export type TypeDefinition = typeof typeDefinition.$inferSelect;
export type NewTypeDefinition = typeof typeDefinition.$inferInsert;
