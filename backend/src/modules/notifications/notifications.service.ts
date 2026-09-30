import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { notificationDeliveryInstructions, notificationDeliveryStatusEvents } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { SmsContactConfirmationService } from "../integrations/telecoms/sms-contact-confirmation.service";
import { createEmailAdapter, type NotificationChannelAdapter } from "./email.adapter";
import { randomUUID } from "node:crypto";

export interface EmailAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
}

export interface SendNotificationInput {
  visitId?: string;
  channelCode: "email" | "sms" | "ussd" | "whatsapp";
  recipientReference: string;
  message: string;
  subject?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

const MAX_DELIVERY_ATTEMPTS = 5;

/** Full jitter-free exponential backoff, capped at 1 hour. */
function backoffMs(attemptCount: number): number {
  return Math.min(2 ** attemptCount * 30_000, 60 * 60_000);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly emailAdapter: NotificationChannelAdapter = createEmailAdapter();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly smsContactConfirmation: SmsContactConfirmationService,
  ) {}

  /** System/worker path — same outbox semantics without a human JWT. */
  async sendForOrganisation(input: SendNotificationInput & { organisationId: string }) {
    return this.send(input, {
      userId: "00000000-0000-0000-0000-000000000001",
      organisationId: input.organisationId,
      siteId: null,
      roleCode: "system",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
      audience: "admin",
    });
  }

  /**
   * Enqueue only — persists the message and returns immediately with status
   * `pending`. NotificationDispatchWorkerService drains the outbox and calls
   * attemptDelivery(). Callers no longer get a synchronous delivered/failed
   * result; check notification_delivery_status_events for outcome.
   */
  async send(input: SendNotificationInput, user: AuthenticatedUser) {
    const channelCode = await this.typeDefs.id("notification_channel", input.channelCode);
    const pendingStatus = await this.typeDefs.id("notification_delivery_status", "pending");

    const [created] = await this.db
      .insert(notificationDeliveryInstructions)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        visitId: input.visitId,
        channelCode,
        recipientReference: input.recipientReference,
        statusCode: pendingStatus,
        subject: input.subject,
        message: input.message,
        html: input.html,
        attachmentsJson: input.attachments?.length ? input.attachments : undefined,
        nextAttemptAt: new Date(),
      })
      .returning();

    await this.db.insert(notificationDeliveryStatusEvents).values({
      id: randomUUID(),
      notificationDeliveryInstructionId: created.id,
      fromStatusCode: null,
      toStatusCode: pendingStatus,
    });

    return created;
  }

  /**
   * Called only by NotificationDispatchWorkerService. Attempts one delivery
   * for an already-enqueued row and updates its status + retry bookkeeping.
   * No SELECT ... FOR UPDATE SKIP LOCKED — assumes a single dispatcher
   * instance, same assumption HostNotificationEscalationEvaluationService
   * already makes for its polling loop.
   */
  async attemptDelivery(row: typeof notificationDeliveryInstructions.$inferSelect) {
    const channelCode = await this.typeDefs.codeById(row.channelCode);

    let delivered = false;
    let failureReason: string | null = null;

    if (channelCode === "email") {
      try {
        const result = await this.emailAdapter.send(row.recipientReference, row.message, {
          subject: row.subject ?? undefined,
          html: row.html ?? undefined,
          attachments: row.attachmentsJson ?? undefined,
        });
        delivered = result.delivered;
      } catch (error) {
        failureReason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Notification dispatch failed for visit ${row.visitId}: ${failureReason}`);
      }
    } else if (channelCode === "sms") {
      const smsResult = await this.smsContactConfirmation.send({
        organisationId: row.organisationId,
        visitId: row.visitId ?? undefined,
        recipientReference: row.recipientReference,
        message: row.message,
      });
      delivered = smsResult.delivered;
      failureReason = smsResult.delivered ? null : (smsResult.failureReason ?? smsResult.outcomeCode);
    } else {
      failureReason = `No adapter implemented for channel '${channelCode}' yet (Section 11.8.4)`;
    }

    if (delivered) {
      const sentStatus = await this.typeDefs.id("notification_delivery_status", "sent");
      await this.db
        .update(notificationDeliveryInstructions)
        .set({ statusCode: sentStatus, sentAt: new Date(), failureReason: null })
        .where(eq(notificationDeliveryInstructions.id, row.id));
      await this.db.insert(notificationDeliveryStatusEvents).values({
        id: randomUUID(),
        notificationDeliveryInstructionId: row.id,
        fromStatusCode: row.statusCode,
        toStatusCode: sentStatus,
        providerCode: channelCode,
      });
      return;
    }

    const nextAttemptCount = row.attemptCount + 1;

    if (nextAttemptCount >= MAX_DELIVERY_ATTEMPTS) {
      const failedStatus = await this.typeDefs.id("notification_delivery_status", "failed");
      await this.db
        .update(notificationDeliveryInstructions)
        .set({ statusCode: failedStatus, attemptCount: nextAttemptCount, failureReason })
        .where(eq(notificationDeliveryInstructions.id, row.id));
      await this.db.insert(notificationDeliveryStatusEvents).values({
        id: randomUUID(),
        notificationDeliveryInstructionId: row.id,
        fromStatusCode: row.statusCode,
        toStatusCode: failedStatus,
        failureCode: failureReason ?? undefined,
      });
      return;
    }

    const pendingStatus = await this.typeDefs.id("notification_delivery_status", "pending");
    await this.db
      .update(notificationDeliveryInstructions)
      .set({
        statusCode: pendingStatus,
        attemptCount: nextAttemptCount,
        nextAttemptAt: new Date(Date.now() + backoffMs(nextAttemptCount)),
        failureReason,
      })
      .where(eq(notificationDeliveryInstructions.id, row.id));
    await this.db.insert(notificationDeliveryStatusEvents).values({
      id: randomUUID(),
      notificationDeliveryInstructionId: row.id,
      fromStatusCode: row.statusCode,
      toStatusCode: pendingStatus,
      failureCode: failureReason ?? undefined,
      note: `Retry ${nextAttemptCount}/${MAX_DELIVERY_ATTEMPTS} scheduled`,
    });
  }

  async listForVisit(visitId: string, user: AuthenticatedUser) {
    return this.db.query.notificationDeliveryInstructions.findMany({
      where: and(
        eq(notificationDeliveryInstructions.visitId, visitId),
        eq(notificationDeliveryInstructions.organisationId, user.organisationId),
      ),
    });
  }
}
