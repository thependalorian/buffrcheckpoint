import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Platform-wide priced catalog (plans + add-ons). Same tenancy exception as
// platform_configuration_setting — Buffr's list prices, not per-tenant.
// One list: kind_code distinguishes plan vs add-on; each row has its own cost.
export const subscriptionCatalogItem = pgTable(
  "subscription_catalog_item",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    kindCode: uuid("kind_code")
      .notNull()
      .references(() => typeDefinition.id),
    itemCode: uuid("item_code")
      .notNull()
      .references(() => typeDefinition.id),
    tagline: text("tagline").notNull().default(""),
    monthlyAmount: numeric("monthly_amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    annualMonthsCharged: integer("annual_months_charged").notNull().default(10),
    // Sites covered by monthly_amount; extra sites bill at extra_site_monthly_amount (NULL = not allowed).
    includedSites: integer("included_sites").notNull().default(1),
    extraSiteMonthlyAmount: numeric("extra_site_monthly_amount", { precision: 15, scale: 2 }),
    featuresJson: jsonb("features_json").$type<string[]>().notNull().default([]),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("idx_subscription_catalog_item_kind_code").on(t.kindCode, t.itemCode),
    index("idx_subscription_catalog_item_kind").on(t.kindCode),
  ],
);

// Billing — manual EFT + Proof of Payment (POP) reconciliation. No PSP
// partnership exists yet (confirmed with George): invoice shows Buffr
// Financial Services CC's bank details, the customer pays by EFT off-
// platform, uploads a POP, and platform_support manually reviews/confirms.
// payment_method_code is the one seam for a future PSP: a new value plus a
// webhook receiver, no redesign of invoice/payment_transaction needed.
export const organisationSubscription = pgTable(
  "organisation_subscription",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    planCode: uuid("plan_code")
      .notNull()
      .references(() => typeDefinition.id),
    billingPeriodCode: uuid("billing_period_code")
      .notNull()
      .references(() => typeDefinition.id),
    // Contracted monthly equivalent = plan + extra sites + active add-ons (annual pro-rates).
    mrrAmount: numeric("mrr_amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    // Application-code gate only (Wiebe rule 4 — zero DB triggers):
    // billing.service.ts refuses an 'active' transition while the org's
    // latest KYB status isn't 'verified'.
    kybGatePassed: boolean("kyb_gate_passed").notNull().default(false),
    // Licensed sites (billing seat count). Changes are logged in organisationSubscriptionSiteQuantityLog.
    siteQuantity: integer("site_quantity").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_organisation_subscription_org").on(t.organisationId)],
);

export const organisationSubscriptionStatusEvents = pgTable(
  "organisation_subscription_status_events",
  {
    id: uuid("id").primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => organisationSubscription.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_organisation_subscription_status_events_sub").on(t.subscriptionId, t.occurredAt)],
);

// Selected add-ons on a subscription — pick from subscription_catalog_item
// (kind=addon) only. Each row snapshots its own monthly cost at attach time.
export const organisationSubscriptionAddon = pgTable(
  "organisation_subscription_addon",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => organisationSubscription.id),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => subscriptionCatalogItem.id),
    monthlyAmount: numeric("monthly_amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_organisation_subscription_addon_org").on(t.organisationId),
    index("idx_organisation_subscription_addon_sub").on(t.subscriptionId),
  ],
);

export const organisationSubscriptionAddonStatusLog = pgTable(
  "organisation_subscription_addon_status_log",
  {
    id: uuid("id").primaryKey(),
    subscriptionAddonId: uuid("subscription_addon_id")
      .notNull()
      .references(() => organisationSubscriptionAddon.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_organisation_subscription_addon_status_log_addon").on(t.subscriptionAddonId, t.occurredAt)],
);

export const organisationSubscriptionSiteQuantityLog = pgTable(
  "organisation_subscription_site_quantity_log",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => organisationSubscription.id),
    fromQuantity: integer("from_quantity"),
    toQuantity: integer("to_quantity").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    note: text("note"),
  },
  (t) => [index("idx_org_subscription_site_quantity_log_org_sub").on(t.organisationId, t.subscriptionId, t.occurredAt)],
);

export const invoice = pgTable(
  "invoice",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    invoiceNumber: text("invoice_number").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("idx_invoice_number").on(t.invoiceNumber), index("idx_invoice_org").on(t.organisationId)],
);

export const invoiceLineItem = pgTable(
  "invoice_line_item",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [index("idx_invoice_line_item_invoice").on(t.invoiceId)],
);

// Corrections to an issued invoice are credit notes, never an UPDATE on the
// issued row (Wiebe: log/ledger rows immutable).
export const invoiceCreditNote = pgTable(
  "invoice_credit_note",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoice.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    reason: text("reason").notNull(),
    issuedBy: uuid("issued_by").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_invoice_credit_note_invoice").on(t.invoiceId)],
);

// Append-only payment ledger. A rejected/corrected POP is a new row
// referencing the original via supersedesTransactionId, never an edit.
export const paymentTransaction = pgTable(
  "payment_transaction",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    invoiceId: uuid("invoice_id").references(() => invoice.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    paymentMethodCode: uuid("payment_method_code")
      .notNull()
      .references(() => typeDefinition.id),
    popDocumentReference: text("pop_document_reference"),
    submittedBy: uuid("submitted_by"),
    supersedesTransactionId: uuid("supersedes_transaction_id"),
    // Card payments (Adumo Online, db/migrations/0042). Never card data:
    // only the processor's transaction index, status, result code and the
    // masked PAN (first 6 and last 4 digits).
    processorTransactionIndex: text("processor_transaction_index"),
    processorStatus: text("processor_status"),
    processorResultCode: text("processor_result_code"),
    cardMaskedPan: text("card_masked_pan"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_payment_transaction_org").on(t.organisationId),
    index("idx_payment_transaction_invoice").on(t.invoiceId),
    index("idx_payment_transaction_status").on(t.statusCode),
  ],
);

// Required reconciliation artifact — a manual review record here rather
// than a processor webhook match. Every payment_transaction must pass
// through one of these before its status can leave pending_review.
export const paymentReconciliationLog = pgTable(
  "payment_reconciliation_log",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    paymentTransactionId: uuid("payment_transaction_id")
      .notNull()
      .references(() => paymentTransaction.id),
    reviewedBy: uuid("reviewed_by").notNull(),
    decision: text("decision").notNull(), // 'confirmed' | 'rejected'
    note: text("note"),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_payment_reconciliation_log_txn").on(t.paymentTransactionId)],
);

export type SubscriptionCatalogItem = typeof subscriptionCatalogItem.$inferSelect;
export type OrganisationSubscription = typeof organisationSubscription.$inferSelect;
export type NewOrganisationSubscription = typeof organisationSubscription.$inferInsert;
export type OrganisationSubscriptionAddon = typeof organisationSubscriptionAddon.$inferSelect;
export type Invoice = typeof invoice.$inferSelect;
export type NewInvoice = typeof invoice.$inferInsert;
export type PaymentTransaction = typeof paymentTransaction.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransaction.$inferInsert;
