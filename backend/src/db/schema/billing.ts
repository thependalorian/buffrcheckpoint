import { boolean, char, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Billing — manual EFT + Proof of Payment (POP) reconciliation. No PSP
// partnership exists yet (confirmed with George): invoice shows Buffr
// Financial Services CC's bank details, the customer pays by EFT off-
// platform, uploads a POP, and platform_support manually reviews/confirms.
// payment_method_code is the one seam for a future PSP: a new value plus a
// webhook receiver, no redesign of invoice/payment_transaction needed.
export const organisationSubscription = pgTable(
  "organisation_subscription",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    planCode: uuid("plan_code")
      .notNull()
      .references(() => typeDefinition.id),
    mrrAmount: numeric("mrr_amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("NAD"),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    // Application-code gate only (Wiebe rule 4 — zero DB triggers):
    // billing.service.ts refuses an 'active' transition while the org's
    // latest KYB status isn't 'verified'.
    kybGatePassed: boolean("kyb_gate_passed").notNull().default(false),
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

export const invoice = pgTable(
  "invoice",
  {
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
  (t) => [
    uniqueIndex("idx_invoice_number").on(t.invoiceNumber),
    index("idx_invoice_org").on(t.organisationId),
  ],
);

export const invoiceLineItem = pgTable(
  "invoice_line_item",
  {
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

export type OrganisationSubscription = typeof organisationSubscription.$inferSelect;
export type NewOrganisationSubscription = typeof organisationSubscription.$inferInsert;
export type Invoice = typeof invoice.$inferSelect;
export type NewInvoice = typeof invoice.$inferInsert;
export type PaymentTransaction = typeof paymentTransaction.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransaction.$inferInsert;
