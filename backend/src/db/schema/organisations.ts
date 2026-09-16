import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { typeDefinition } from "./type-definitions";

// Tenant root. Renamed from `organisation` per the "Canonical Engineering
// Constitution" naming convention (buffrcheckpoint.md).
export const organisations = pgTable(
  "organisations",
  {
    id: uuid("id").primaryKey(),
    legalName: text("legal_name").notNull(),
    tradingName: text("trading_name"),
    registrationReference: text("registration_reference"),
    sectorCode: uuid("sector_code").references(() => typeDefinition.id),
    defaultTimezone: text("default_timezone").notNull().default("Africa/Windhoek"),
    dataResidencyPolicy: text("data_residency_policy"),
    // Platform Ops Console CRM field — lead/trial/customer/churned.
    lifecycleStageCode: uuid("lifecycle_stage_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_organisations_active").on(t.id)],
);

export const organisationSettings = pgTable(
  "organisation_settings",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    defaultRetentionPolicyId: uuid("default_retention_policy_id"),
    defaultLanguageCode: uuid("default_language_code").references(() => typeDefinition.id),
    emergencyModeEnabled: boolean("emergency_mode_enabled").notNull().default(false),
    identityVerificationPolicy: jsonb("identity_verification_policy").notNull().default({}),
    /** custom | bian_aligned | hybrid — BIAN template is opt-in, never required. */
    directoryTaxonomyModeCode: uuid("directory_taxonomy_mode_code").references(() => typeDefinition.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_organisation_settings_org").on(t.organisationId)],
);

export const regions = pgTable(
  "regions",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    name: text("name").notNull(),
    code: text("code"),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_regions_org").on(t.organisationId)],
);

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
export type Region = typeof regions.$inferSelect;
