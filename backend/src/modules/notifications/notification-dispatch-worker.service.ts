import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { and, eq, isNull, lte } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { notificationDeliveryInstructions } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { NotificationsService } from "./notifications.service";

const BATCH_LIMIT = 50;

// Drains the notification outbox on an interval. Same OnModuleInit/setInterval
// shape as HostNotificationEscalationEvaluationService — no job-scheduling
// dependency added for this. Assumes a single dispatcher instance (no
// SELECT ... FOR UPDATE SKIP LOCKED), matching that worker's existing
// concurrency assumption.
@Injectable()
export class NotificationDispatchWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationDispatchWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    const intervalMs = Number(process.env.NOTIFICATION_DISPATCH_INTERVAL_MS ?? 15_000);
    this.timer = setInterval(() => {
      void this.dispatchDuePending().catch((error) => {
        this.logger.warn(
          `Notification dispatch tick failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, intervalMs);
    this.logger.log(`Notification dispatch worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async dispatchDuePending() {
    const pendingStatus = await this.typeDefs.id("notification_delivery_status", "pending");

    const due = await this.db.query.notificationDeliveryInstructions.findMany({
      where: and(
        eq(notificationDeliveryInstructions.statusCode, pendingStatus),
        lte(notificationDeliveryInstructions.nextAttemptAt, new Date()),
        isNull(notificationDeliveryInstructions.deletedAt),
      ),
      orderBy: (t, { asc }) => asc(t.nextAttemptAt),
      limit: BATCH_LIMIT,
    });

    for (const row of due) {
      await this.notifications.attemptDelivery(row);
    }
  }
}
