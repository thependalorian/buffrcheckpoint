import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Scheduled reports (db/migrations/0046_scheduled_reports.sql).
// recipient_references_jsonb is a list of role codes, resolved at send time
// to verified users of the same organisation.

export const scheduledReportConfigurations = pgTable("scheduled_report_configurations", {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  id: uuid("id").primaryKey(),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  reportCode: uuid("report_code")
    .notNull()
    .references(() => typeDefinition.id),
  cadenceCode: uuid("cadence_code")
    .notNull()
    .references(() => typeDefinition.id),
  formatCode: uuid("format_code")
    .notNull()
    .references(() => typeDefinition.id),
  recipientReferencesJsonb: jsonb("recipient_references_jsonb").$type<string[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const scheduledReportRun = pgTable("scheduled_report_run", {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  id: uuid("id").primaryKey(),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  reportCode: uuid("report_code")
    .notNull()
    .references(() => typeDefinition.id),
  periodKey: text("period_key").notNull(),
  statusCode: uuid("status_code")
    .notNull()
    .references(() => typeDefinition.id),
  recipientCount: integer("recipient_count"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const scheduledReportRunStatusLog = pgTable("scheduled_report_run_status_log", {
  id: uuid("id").primaryKey(),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  reportRunId: uuid("report_run_id")
    .notNull()
    .references(() => scheduledReportRun.id),
  fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
  toStatusCode: uuid("to_status_code")
    .notNull()
    .references(() => typeDefinition.id),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});
