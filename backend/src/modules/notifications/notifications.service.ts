import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { notificationDeliveryInstructions, notificationDeliveryStatusEvents } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { SmsContactConfirmationService } from "../integrations/telecoms/sms-contact-confirmation.service";
import { createEmailAdapter, type NotificationChannelAdapter } from "./email.adapter";
import { EmailBudgetExhaustedError } from "./smtp-email.adapter";
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
/** How long a dispatcher owns a row it has claimed but not finished with (crash recovery: the row becomes due again). */
const CLAIM_LEASE_MS = 60_000;

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
   *
   * Rows are claimed first (conditional update on attempt_count + status, see
   * below) instead of assuming a single dispatcher instance: two app
   * instances polling the same outbox were observed racing one row — both
   * could send it, and both counted the retries, so a message could land
   * twice and burn its five attempts in half the time.
   */
  async attemptDelivery(row: typeof notificationDeliveryInstructions.$inferSelect) {
    const channelCode = await this.typeDefs.codeById(row.channelCode);

    if (channelCode === "email") {
      // Over the mailbox's hourly or daily cap: leave the message queued for the next window. Checked before the claim, so
      // waiting for the budget to reset never consumes a retry.
      if (
        "hasRoom" in this.emailAdapter &&
        typeof this.emailAdapter.hasRoom === "function" &&
        !this.emailAdapter.hasRoom()
      ) {
        return;
      }
    }

    // Claim: exactly one dispatcher wins this row, everyone else skips it. The lease also covers a crash mid-send.
    const claimed = await this.db
      .update(notificationDeliveryInstructions)
      .set({
        attemptCount: row.attemptCount + 1,
        nextAttemptAt: new Date(Date.now() + CLAIM_LEASE_MS),
      })
      .where(
        and(
          eq(notificationDeliveryInstructions.id, row.id),
          eq(notificationDeliveryInstructions.statusCode, row.statusCode),
          eq(notificationDeliveryInstructions.attemptCount, row.attemptCount),
        ),
      )
      .returning({ id: notificationDeliveryInstructions.id });
    if (claimed.length === 0) return;

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
        if (error instanceof EmailBudgetExhaustedError) {
          // The mailbox hit its cap mid-send: not a failed attempt, so hand the claim back.
          await this.db
            .update(notificationDeliveryInstructions)
            .set({ attemptCount: row.attemptCount })
            .where(eq(notificationDeliveryInstructions.id, row.id));
          return;
        }
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
      // The message is dead: say so loudly. This is the line that would have surfaced "no verification email arrived".
      this.logger.error(
        `Notification permanently failed [${channelCode}] to=${row.recipientReference} subject=${row.subject ?? "-"}: ${failureReason ?? "unknown error"}`,
      );
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
