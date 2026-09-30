import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

// Renamed `form_template`/`form_template_version`/`form_field_definition`
// -> `check_in_form_definitions`/`check_in_form_versions`/
// `check_in_form_fields`. `form_field_rule` folded into
// `check_in_form_fields.validationSchema` (no separate rule table — it had
// no rows and no caller).
export const checkInFormDefinitions = pgTable(
  "check_in_form_definitions",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    visitorCategoryCode: uuid("visitor_category_code")
      .notNull()
      .references(() => typeDefinition.id),
    siteId: uuid("site_id").references(() => sites.id),
    formName: text("form_name"),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_check_in_form_definitions_org").on(t.organisationId)],
);

// Immutable once published — a correction is a new version row.
export const checkInFormVersions = pgTable(
  "check_in_form_versions",
  {
    id: uuid("id").primaryKey(),
    formDefinitionId: uuid("form_definition_id")
      .notNull()
      .references(() => checkInFormDefinitions.id),
    versionNumber: integer("version_number").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    approvalReference: text("approval_reference"),
    statusCode: uuid("status_code").references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_check_in_form_versions_definition").on(t.formDefinitionId),
    uniqueIndex("idx_check_in_form_versions_definition_version").on(t.formDefinitionId, t.versionNumber),
  ],
);

export const checkInFormFields = pgTable(
  "check_in_form_fields",
  {
    id: uuid("id").primaryKey(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => checkInFormVersions.id),
    fieldCode: text("field_code").notNull(),
    fieldLabel: text("field_label"),
    fieldTypeCode: uuid("field_type_code")
      .notNull()
      .references(() => typeDefinition.id), // domain 'field_type'
    helpText: text("help_text"),
    dataClassificationCode: uuid("data_classification_code")
      .notNull()
      .references(() => typeDefinition.id), // domain 'field_class'
    required: boolean("required").notNull().default(false),
    visibilityRule: jsonb("visibility_rule").notNull().default({}),
    validationSchema: jsonb("validation_schema").notNull().default({}),
    displayOrder: integer("display_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_check_in_form_fields_version").on(t.formVersionId)],
);

export const checkInFormFieldTranslations = pgTable(
  "check_in_form_field_translations",
  {
    id: uuid("id").primaryKey(),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => checkInFormFields.id),
    languageCode: uuid("language_code")
      .notNull()
      .references(() => typeDefinition.id), // domain 'language_code'
    fieldLabel: text("field_label"),
    helpText: text("help_text"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_check_in_form_field_translations_field").on(t.fieldId),
    uniqueIndex("idx_check_in_form_field_translations_unique").on(t.fieldId, t.languageCode),
  ],
);

// Renamed `visitor_type_policy` -> `visitor_categories`.
export const visitorCategories = pgTable(
  "visitor_categories",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    visitorCategoryCode: uuid("visitor_category_code")
      .notNull()
      .references(() => typeDefinition.id), // domain 'visitor_type'
    formDefinitionId: uuid("form_definition_id")
      .notNull()
      .references(() => checkInFormDefinitions.id),
    defaultRiskTierCode: uuid("default_risk_tier_code").references(() => typeDefinition.id),
    defaultAssuranceLevelCode: uuid("default_assurance_level_code")
      .notNull()
      .references(() => typeDefinition.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_visitor_categories_org").on(t.organisationId),
    uniqueIndex("idx_visitor_categories_org_code").on(t.organisationId, t.visitorCategoryCode),
  ],
);

export type CheckInFormDefinition = typeof checkInFormDefinitions.$inferSelect;
export type CheckInFormVersion = typeof checkInFormVersions.$inferSelect;
export type CheckInFormField = typeof checkInFormFields.$inferSelect;
export type CheckInFormFieldTranslation = typeof checkInFormFieldTranslations.$inferSelect;
export type VisitorCategory = typeof visitorCategories.$inferSelect;
