import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { typeDefinition } from "./type-definitions";
import { visitorVisits } from "./visits";

// Renamed `notification_event` -> `notification_delivery_instructions`.
// Real transactional outbox: message content is persisted at enqueue time
// (status `pending`), and NotificationDispatchWorkerService drains it on an
// interval, same pattern as HostNotificationEscalationEvaluationService.
// Status transitions are append-only in notificationDeliveryStatusEvents
// below rather than mutating this row's history away.
export const notificationDeliveryInstructions = pgTable(
  "notification_delivery_instructions",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    visitId: uuid("visit_id").references(() => visitorVisits.id),
    recipientReference: text("recipient_reference").notNull(),
    channelCode: uuid("channel_code")
      .notNull()
      .references(() => typeDefinition.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    subject: text("subject"),
    message: text("message").notNull().default(""),
    html: text("html"),
    /** Resend attachments: [{ filename, contentBase64, contentType }] */
    attachmentsJson: jsonb("attachments_json").$type<
      Array<{ filename: string; contentBase64: string; contentType: string }>
    >(),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    failureReason: text("failure_reason"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_notification_delivery_instructions_visit").on(t.visitId),
    index("idx_notification_delivery_instructions_dispatch").on(t.statusCode, t.nextAttemptAt),
  ],
);

export const notificationDeliveryStatusEvents = pgTable(
  "notification_delivery_status_events",
  {
    id: uuid("id").primaryKey(),
    notificationDeliveryInstructionId: uuid("notification_delivery_instruction_id")
      .notNull()
      .references(() => notificationDeliveryInstructions.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    providerCode: text("provider_code"),
    failureCode: text("failure_code"),
    note: text("note"),
  },
  (t) => [
    index("idx_notification_delivery_status_events_instruction").on(t.notificationDeliveryInstructionId, t.occurredAt),
  ],
);

export type NotificationDeliveryInstruction = typeof notificationDeliveryInstructions.$inferSelect;
export type NewNotificationDeliveryInstruction = typeof notificationDeliveryInstructions.$inferInsert;
export type NotificationDeliveryStatusEvent = typeof notificationDeliveryStatusEvents.$inferSelect;
export type NewNotificationDeliveryStatusEvent = typeof notificationDeliveryStatusEvents.$inferInsert;
