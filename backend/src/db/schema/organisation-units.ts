import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

/**
 * Tenant-populated organisation directory shaped like the BIAN Service Landscape:
 * Business Area → Business Domain → Service Domain / department / team.
 * Companies populate their own tree; BIAN area codes are optional taxonomy tags.
 */
export const organisationUnits = pgTable(
  "organisation_units",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id").references(() => sites.id),
    parentId: uuid("parent_id"),
    unitKindCode: uuid("unit_kind_code")
      .notNull()
      .references(() => typeDefinition.id),
    bianAreaCode: uuid("bian_area_code").references(() => typeDefinition.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_organisation_units_org").on(t.organisationId),
    index("idx_organisation_units_org_parent").on(t.organisationId, t.parentId),
    uniqueIndex("idx_organisation_units_org_code").on(t.organisationId, t.code),
  ],
);

export const organisationUnitStatusEvents = pgTable(
  "organisation_unit_status_events",
  {
    id: uuid("id").primaryKey(),
    organisationUnitId: uuid("organisation_unit_id")
      .notNull()
      .references(() => organisationUnits.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_organisation_unit_status_events_unit").on(t.organisationUnitId, t.occurredAt)],
);

export type OrganisationUnit = typeof organisationUnits.$inferSelect;
export type NewOrganisationUnit = typeof organisationUnits.$inferInsert;
