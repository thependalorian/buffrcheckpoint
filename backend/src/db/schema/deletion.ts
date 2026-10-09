import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { privacyRequests } from "./dsar";
import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";

// One task per system and data category for an account-deletion request (DL-7). Idempotent through (organisation, idempotency_key).
export const dataDispositionTask = pgTable(
  "data_disposition_task",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    requestId: uuid("request_id")
      .notNull()
      .references(() => privacyRequests.id),
    systemCode: uuid("system_code")
      .notNull()
      .references(() => typeDefinition.id),
    actionCode: uuid("action_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    retentionBasisCode: uuid("retention_basis_code").references(() => typeDefinition.id),
    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }),
    idempotencyKey: text("idempotency_key").notNull(),
    externalReference: text("external_reference"),
    attemptCount: integer("attempt_count").notNull().default(0),
    /** Failure reason without personal data. */
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_data_disposition_task_key")
      .on(t.organisationId, t.idempotencyKey)
      .where(sql`${t.deletedAt} is null`),
    index("idx_data_disposition_task_request").on(t.organisationId, t.requestId).where(sql`${t.deletedAt} is null`),
    index("idx_data_disposition_task_due")
      .on(t.organisationId, t.statusCode, t.nextAttemptAt)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const dataDispositionTaskStatusLog = pgTable(
  "data_disposition_task_status_log",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    taskId: uuid("task_id")
      .notNull()
      .references(() => dataDispositionTask.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    reasonCode: text("reason_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_data_disposition_task_status_log_task").on(t.organisationId, t.taskId, t.occurredAt)],
);

// A keyed HMAC of an erased subject, kept until the backup horizon so a restore can replay the erasure (DL-10). No plaintext identity.
export const deletionRecoveryTombstone = pgTable(
  "deletion_recovery_tombstone",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    requestId: uuid("request_id")
      .notNull()
      .references(() => privacyRequests.id),
    subjectHmac: text("subject_hmac").notNull(),
    erasedAt: timestamp("erased_at", { withTimezone: true }).notNull(),
    replayUntil: timestamp("replay_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_deletion_recovery_tombstone_request")
      .on(t.organisationId, t.requestId)
      .where(sql`${t.deletedAt} is null`),
    index("idx_deletion_recovery_tombstone_replay")
      .on(t.organisationId, t.replayUntil)
      .where(sql`${t.deletedAt} is null`),
  ],
);
