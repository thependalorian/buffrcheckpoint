import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// Renamed `data_subject_request`/`dsar_status_log` -> `privacy_requests`/
// `privacy_request_status_log`.
export const privacyRequests = pgTable(
  "privacy_requests",
  {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    subjectReference: text("subject_reference").notNull(),
    requestTypeCode: uuid("request_type_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    exportFileReference: text("export_file_reference"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_privacy_requests_org").on(t.organisationId)],
);

export const privacyRequestStatusLog = pgTable(
  "privacy_request_status_log",
  {
    id: uuid("id").primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => privacyRequests.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid("actor_id"),
    reason: text("reason"),
  },
  (t) => [index("idx_privacy_request_status_log_request").on(t.requestId, t.occurredAt)],
);

export type PrivacyRequest = typeof privacyRequests.$inferSelect;
export type NewPrivacyRequest = typeof privacyRequests.$inferInsert;
