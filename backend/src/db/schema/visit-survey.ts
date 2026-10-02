import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { analyticsEtlRun } from "./analytics";
import { organisations } from "./organisations";
import { sites } from "./sites";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

// Post-visit satisfaction micro-survey (db/migrations/0044_visit_survey.sql).
// Rating only; satisfaction_rating's sort_order is the numeric score.

export const visitSurveyResponses = pgTable(
  "visit_survey_responses",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visitorVisits.id),
    ratingCode: uuid("rating_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    captureChannelCode: uuid("capture_channel_code").references(() => typeDefinition.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_visit_survey_responses_org_site_submitted").on(t.organisationId, t.siteId, t.submittedAt)],
);

export const visitSurveyResponseStatusEvents = pgTable("visit_survey_response_status_events", {
  id: uuid("id").primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id),
  responseId: uuid("response_id")
    .notNull()
    .references(() => visitSurveyResponses.id),
  fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
  toStatusCode: uuid("to_status_code")
    .notNull()
    .references(() => typeDefinition.id),
  actorId: uuid("actor_id"),
  reason: text("reason"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visitSurveyDailyFact = pgTable("visit_survey_daily_fact", {
  id: uuid("id").primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id),
  localDate: date("local_date").notNull(),
  responseCount: integer("response_count").notNull(),
  ratingTotal: integer("rating_total").notNull(),
  satisfiedCount: integer("satisfied_count").notNull(),
  etlRunId: uuid("etl_run_id")
    .notNull()
    .references(() => analyticsEtlRun.id),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});
