import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Retention disposition (db/migrations/0043_retention_disposition.sql). One
// run row per organisation per execution; current state is denormalised onto
// the run, history lives in the append-only status log.
export const retentionDispositionRun = pgTable(
  "retention_disposition_run",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    dryRun: boolean("dry_run").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    candidateCount: integer("candidate_count"),
    disposedCount: integer("disposed_count"),
    heldCount: integer("held_count"),
    shreddedSubjectCount: integer("shredded_subject_count"),
    errorMessage: text("error_message"),
    requestedBy: uuid("requested_by"),
  },
  (t) => [index("idx_retention_disposition_run_org_started").on(t.organisationId, t.startedAt)],
);

export const retentionDispositionRunStatusLog = pgTable(
  "retention_disposition_run_status_log",
  {
    id: uuid("id").primaryKey(),
    dispositionRunId: uuid("disposition_run_id")
      .notNull()
      .references(() => retentionDispositionRun.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_retention_disposition_run_status_log_run").on(t.dispositionRunId, t.occurredAt)],
);

export type RetentionDispositionRun = typeof retentionDispositionRun.$inferSelect;
