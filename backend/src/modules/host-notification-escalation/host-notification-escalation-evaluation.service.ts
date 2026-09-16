import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { hostNotificationEscalationEvents, visitStatusEvents, visitorVisits } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { NotificationsService } from "../notifications/notifications.service";
import { HostNotificationEscalationService } from "./host-notification-escalation.service";

@Injectable()
export class HostNotificationEscalationEvaluationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HostNotificationEscalationEvaluationService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly escalationService: HostNotificationEscalationService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    const intervalMs = Number(process.env.ESCALATION_EVAL_INTERVAL_MS ?? 60_000);
    this.timer = setInterval(() => {
      void this.evaluateDueEscalations().catch((error) => {
        this.logger.warn(`Escalation evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, intervalMs);
    this.logger.log(`Host-notification escalation worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async evaluateDueEscalations() {
    const checkedInStatus = await this.typeDefs.id("visit_status", "checked_in");
    const openVisits = await this.db.query.visitorVisits.findMany({
      where: and(eq(visitorVisits.statusCode, checkedInStatus), isNull(visitorVisits.deletedAt), isNull(visitorVisits.checkedOutAt)),
      limit: 200,
    });

    for (const visit of openVisits) {
      const existing = await this.db.query.hostNotificationEscalationEvents.findFirst({
        where: eq(hostNotificationEscalationEvents.visitId, visit.id),
      });
      if (existing) continue;

      const policy = await this.escalationService.resolveEffectivePolicy(
        visit.organisationId,
        visit.siteId,
        visit.visitorCategoryCode,
      );
      if (!policy) continue;

      const elapsedSeconds = (Date.now() - visit.checkedInAt.getTime()) / 1000;
      if (elapsedSeconds < policy.version.waitSeconds) continue;

      await this.applyEscalation(visit, policy.version.id, policy.escalationActionCode, policy.version.alternateRecipientReference);
    }
  }

  private async applyEscalation(
    visit: typeof visitorVisits.$inferSelect,
    policyVersionId: string,
    actionCode: string,
    alternateRecipient: string | null,
  ) {
    const actionTypeId = await this.typeDefs.id("host_notification_escalation_action", actionCode);

    await this.db.insert(hostNotificationEscalationEvents).values({
      id: randomUUID(),
      organisationId: visit.organisationId,
      siteId: visit.siteId,
      visitId: visit.id,
      escalationPolicyVersionId: policyVersionId,
      escalationActionCode: actionTypeId,
    });

    const message = `Escalation (${actionCode}) for visit ${visit.id} — host did not respond in time.`;

    if (actionCode.startsWith("notify_") && alternateRecipient) {
      await this.notifications
        .sendForOrganisation({
          organisationId: visit.organisationId,
          visitId: visit.id,
          channelCode: "email",
          recipientReference: alternateRecipient,
          message,
        })
        .catch(() => undefined);
    }

    if (actionCode === "hold_entry") {
      const pendingStatus = await this.typeDefs.id("visit_status", "pending_approval");
      if (visit.statusCode !== pendingStatus) {
        await this.db
          .update(visitorVisits)
          .set({ statusCode: pendingStatus })
          .where(eq(visitorVisits.id, visit.id));
        await this.db.insert(visitStatusEvents).values({
          id: randomUUID(),
          visitId: visit.id,
          toStatusCode: pendingStatus,
          occurredAt: new Date(),
        });
      }
    }

    if (actionCode === "auto_admit_low_risk") {
      const admittedStatus = await this.typeDefs.id("visit_status", "admitted");
      await this.db
        .update(visitorVisits)
        .set({ statusCode: admittedStatus })
        .where(eq(visitorVisits.id, visit.id));
      await this.db.insert(visitStatusEvents).values({
        id: randomUUID(),
        visitId: visit.id,
        toStatusCode: admittedStatus,
        occurredAt: new Date(),
      });
    }

    this.logger.log(`Applied escalation ${actionCode} for visit ${visit.id}`);
  }
}
