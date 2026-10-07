import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations, regions } from "./organisations";
import { typeDefinition } from "./type-definitions";

export const sites = pgTable(
  "sites",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    regionId: uuid("region_id").references(() => regions.id),
    // Namibia's 14 administrative regions (distinct from the per-org
    // `regions` table above) — feeds the Ops Console's regional choropleth.
    namibiaRegionCode: uuid("namibia_region_code").references(() => typeDefinition.id),
    name: text("name").notNull(),
    siteCode: text("site_code"),
    physicalAddress: text("physical_address"),
    timezone: text("timezone").notNull().default("Africa/Windhoek"),
    riskTierCode: uuid("risk_tier_code").references(() => typeDefinition.id),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_sites_org").on(t.organisationId)],
);

export const securityZones = pgTable(
  "security_zones",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    name: text("name").notNull(),
    zoneCode: text("zone_code"),
    riskTierCode: uuid("risk_tier_code").references(() => typeDefinition.id),
    hostApprovalRequired: boolean("host_approval_required").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_security_zones_org_site").on(t.organisationId, t.siteId)],
);

// Rotating kiosk site code (Section 6.2) — unchanged by the rename.
export const siteCheckinCode = pgTable(
  "site_checkin_code",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    code: text("code").notNull(),
    activeFrom: timestamp("active_from", { withTimezone: true }).notNull(),
    activeUntil: timestamp("active_until", { withTimezone: true }).notNull(),
  },
  (t) => [index("idx_site_checkin_code_org_site_active").on(t.organisationId, t.siteId, t.activeUntil)],
);

// Unchanged by the rename — not part of the new document's own table list.
export const accessPolicy = pgTable(
  "access_policy",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id").references(() => sites.id),
    zoneId: uuid("zone_id").references(() => securityZones.id),
    config: jsonb("config").notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_access_policy_org").on(t.organisationId)],
);

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id").references(() => sites.id),
    retentionDays: integer("retention_days").notNull(),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_retention_policies_org_site").on(t.organisationId, t.siteId)],
);

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type SecurityZone = typeof securityZones.$inferSelect;
