import { date, index, integer, numeric, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";

// Analytics ETL (db/migrations/0041_analytics_etl.sql). The two fact tables
// are derived, PII-free rollups of visitor_visits that the ETL recomputes in
// place for each local date in a run's window. Unique grain indexes live in
// the migration (NULLS NOT DISTINCT is not expressible here); upserts target
// them by column list.

export const analyticsEtlRun = pgTable(
  "analytics_etl_run",
  {
    id: uuid("id").primaryKey(),
    runKindCode: uuid("run_kind_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    windowFrom: date("window_from").notNull(),
    windowTo: date("window_to").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    rowsWritten: integer("rows_written"),
    sourceVisitCount: integer("source_visit_count"),
    factVisitCount: integer("fact_visit_count"),
    errorMessage: text("error_message"),
    requestedBy: uuid("requested_by"),
  },
  (t) => [index("idx_analytics_etl_run_started").on(t.startedAt)],
);

export const analyticsEtlRunStatusLog = pgTable(
  "analytics_etl_run_status_log",
  {
    id: uuid("id").primaryKey(),
    etlRunId: uuid("etl_run_id")
      .notNull()
      .references(() => analyticsEtlRun.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_analytics_etl_run_status_log_run").on(t.etlRunId, t.occurredAt)],
);

export const visitDailyFact = pgTable(
  "visit_daily_fact",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    localDate: date("local_date").notNull(),
    visitorTypeCode: uuid("visitor_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    arrivalChannelCode: uuid("arrival_channel_code")
      .notNull()
      .references(() => typeDefinition.id),
    purposeCategoryCode: uuid("purpose_category_code").references(() => typeDefinition.id),
    checkInCount: integer("check_in_count").notNull(),
    checkOutCount: integer("check_out_count").notNull(),
    offlineCapturedCount: integer("offline_captured_count").notNull(),
    dwellMinutesTotal: numeric("dwell_minutes_total", { precision: 14, scale: 2 }).notNull(),
    dwellSampleCount: integer("dwell_sample_count").notNull(),
    etlRunId: uuid("etl_run_id")
      .notNull()
      .references(() => analyticsEtlRun.id),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_visit_daily_fact_org_date").on(t.organisationId, t.localDate)],
);

export const visitHourlyFact = pgTable(
  "visit_hourly_fact",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    localDate: date("local_date").notNull(),
    localHour: smallint("local_hour").notNull(),
    checkInCount: integer("check_in_count").notNull(),
    etlRunId: uuid("etl_run_id")
      .notNull()
      .references(() => analyticsEtlRun.id),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_visit_hourly_fact_org_date").on(t.organisationId, t.localDate)],
);

export type AnalyticsEtlRun = typeof analyticsEtlRun.$inferSelect;
export type VisitDailyFact = typeof visitDailyFact.$inferSelect;
export type VisitHourlyFact = typeof visitHourlyFact.$inferSelect;
