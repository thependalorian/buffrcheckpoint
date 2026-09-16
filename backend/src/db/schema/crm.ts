import { boolean, char, date, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// CRM — folded into the organisation record rather than a bolted-on
// product surface. Contact PII is encrypted the same way visitor/host PII
// already is (PersonalDataProtectionService envelope, stored as jsonb).
export const crmContact = pgTable(
  "crm_contact",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    contactNameProtected: jsonb("contact_name_protected").notNull(),
    contactEmailProtected: jsonb("contact_email_protected"),
    contactPhoneProtected: jsonb("contact_phone_protected"),
    roleTitle: text("role_title"),
    isPrimary: boolean("is_primary").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_crm_contact_org").on(t.organisationId)],
);

export const crmDeal = pgTable(
  "crm_deal",
  {
    id: uuid("id").primaryKey(),
    // Nullable — a deal can predate an organisation record for a pure prospect.
    organisationId: uuid("organisation_id").references(() => organisations.id),
    prospectName: text("prospect_name"),
    stageCode: uuid("stage_code")
      .notNull()
      .references(() => typeDefinition.id),
    expectedMrr: numeric("expected_mrr", { precision: 15, scale: 2 }),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    expectedCloseDate: date("expected_close_date"),
    ownerId: uuid("owner_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_crm_deal_org").on(t.organisationId), index("idx_crm_deal_stage").on(t.stageCode)],
);

export const crmDealStatusEvents = pgTable(
  "crm_deal_status_events",
  {
    id: uuid("id").primaryKey(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => crmDeal.id),
    fromStageCode: uuid("from_stage_code").references(() => typeDefinition.id),
    toStageCode: uuid("to_stage_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_crm_deal_status_events_deal").on(t.dealId, t.occurredAt)],
);

export const crmActivityLog = pgTable(
  "crm_activity_log",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    actorId: uuid("actor_id").notNull(),
    activityTypeCode: uuid("activity_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
  },
  (t) => [index("idx_crm_activity_log_org").on(t.organisationId, t.occurredAt)],
);

export type CrmContact = typeof crmContact.$inferSelect;
export type NewCrmContact = typeof crmContact.$inferInsert;
export type CrmDeal = typeof crmDeal.$inferSelect;
export type NewCrmDeal = typeof crmDeal.$inferInsert;
