import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  siteHosts,
  visitorWaitQueueEntries,
  visitorWaitQueueEntryStatusEvents,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

export interface EnqueueResult {
  queueEntryId: string;
  queueNumber: number;
  positionAtEnqueue: number;
  peopleAhead: number;
}

@Injectable()
export class VisitorWaitQueueService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async enqueueForVisit(input: {
    organisationId: string;
    siteId: string;
    visitId: string;
    hostId: string;
    organisationUnitId?: string | null;
    actorId?: string | null;
  }): Promise<EnqueueResult> {
    const existing = await this.db.query.visitorWaitQueueEntries.findFirst({
      where: and(eq(visitorWaitQueueEntries.visitId, input.visitId), isNull(visitorWaitQueueEntries.deletedAt)),
    });
    if (existing) {
      const waitingId = await this.typeDefs.id("wait_queue_status", "waiting");
      const ahead = await this.countAhead(input.organisationId, input.siteId, waitingId, existing.enqueuedAt);
      return {
        queueEntryId: existing.id,
        queueNumber: existing.queueNumber,
        positionAtEnqueue: existing.positionAtEnqueue,
        peopleAhead: Math.max(0, ahead),
      };
    }

    const waitingId = await this.typeDefs.id("wait_queue_status", "waiting");
    const host = await this.db.query.siteHosts.findFirst({
      where: and(eq(siteHosts.id, input.hostId), eq(siteHosts.organisationId, input.organisationId)),
    });
    const unitId = input.organisationUnitId ?? host?.organisationUnitId ?? null;

    const [{ max }] = await this.db
      .select({
        max: sql<number>`coalesce(max(${visitorWaitQueueEntries.queueNumber}), 0)`,
      })
      .from(visitorWaitQueueEntries)
      .where(
        and(
          eq(visitorWaitQueueEntries.organisationId, input.organisationId),
          eq(visitorWaitQueueEntries.siteId, input.siteId),
          sql`(${visitorWaitQueueEntries.enqueuedAt} AT TIME ZONE 'Africa/Windhoek')::date = (now() AT TIME ZONE 'Africa/Windhoek')::date`,
        ),
      );

    const waitingAhead = await this.db.query.visitorWaitQueueEntries.findMany({
      where: and(
        eq(visitorWaitQueueEntries.organisationId, input.organisationId),
        eq(visitorWaitQueueEntries.siteId, input.siteId),
        eq(visitorWaitQueueEntries.statusCode, waitingId),
        isNull(visitorWaitQueueEntries.deletedAt),
      ),
    });

    const queueNumber = Number(max ?? 0) + 1;
    const positionAtEnqueue = waitingAhead.length + 1;
    const id = randomUUID();
    const now = new Date();

    await this.db.insert(visitorWaitQueueEntries).values({
      id,
      organisationId: input.organisationId,
      siteId: input.siteId,
      visitId: input.visitId,
      hostId: input.hostId,
      organisationUnitId: unitId,
      queueNumber,
      positionAtEnqueue,
      statusCode: waitingId,
      enqueuedAt: now,
    });

    await this.db.insert(visitorWaitQueueEntryStatusEvents).values({
      id: randomUUID(),
      queueEntryId: id,
      fromStatusCode: null,
      toStatusCode: waitingId,
      occurredAt: now,
      actorId: input.actorId ?? null,
    });

    return {
      queueEntryId: id,
      queueNumber,
      positionAtEnqueue,
      peopleAhead: waitingAhead.length,
    };
  }

  async listOpen(siteId: string | undefined, user: AuthenticatedUser) {
    const waitingId = await this.typeDefs.id("wait_queue_status", "waiting");
    const calledId = await this.typeDefs.id("wait_queue_status", "called");
    const rows = await this.db.query.visitorWaitQueueEntries.findMany({
      where: and(
        eq(visitorWaitQueueEntries.organisationId, user.organisationId),
        siteId ? eq(visitorWaitQueueEntries.siteId, siteId) : undefined,
        isNull(visitorWaitQueueEntries.deletedAt),
      ),
      orderBy: [asc(visitorWaitQueueEntries.enqueuedAt)],
    });

    return rows
      .filter((r) => r.statusCode === waitingId || r.statusCode === calledId)
      .map((r) => ({
        id: r.id,
        visitId: r.visitId,
        siteId: r.siteId,
        hostId: r.hostId,
        organisationUnitId: r.organisationUnitId,
        queueNumber: r.queueNumber,
        positionAtEnqueue: r.positionAtEnqueue,
        statusCode: r.statusCode === calledId ? "called" : "waiting",
        enqueuedAt: r.enqueuedAt.toISOString(),
        calledAt: r.calledAt?.toISOString() ?? null,
      }));
  }

  async transition(entryId: string, toStatus: "called" | "completed" | "cancelled", user: AuthenticatedUser) {
    const entry = await this.db.query.visitorWaitQueueEntries.findFirst({
      where: and(
        eq(visitorWaitQueueEntries.id, entryId),
        eq(visitorWaitQueueEntries.organisationId, user.organisationId),
        isNull(visitorWaitQueueEntries.deletedAt),
      ),
    });
    if (!entry) throw new NotFoundException("Queue entry not found");

    const toStatusId = await this.typeDefs.id("wait_queue_status", toStatus);
    const now = new Date();
    const patch: Partial<typeof visitorWaitQueueEntries.$inferInsert> = { statusCode: toStatusId };
    if (toStatus === "called") patch.calledAt = now;
    if (toStatus === "completed" || toStatus === "cancelled") patch.completedAt = now;

    await this.db
      .update(visitorWaitQueueEntries)
      .set(patch)
      .where(eq(visitorWaitQueueEntries.id, entryId));

    await this.db.insert(visitorWaitQueueEntryStatusEvents).values({
      id: randomUUID(),
      queueEntryId: entryId,
      fromStatusCode: entry.statusCode,
      toStatusCode: toStatusId,
      occurredAt: now,
      actorId: user.userId,
    });

    return { id: entryId, statusCode: toStatus };
  }

  async completeForVisit(visitId: string, user: AuthenticatedUser) {
    const entry = await this.db.query.visitorWaitQueueEntries.findFirst({
      where: and(
        eq(visitorWaitQueueEntries.visitId, visitId),
        eq(visitorWaitQueueEntries.organisationId, user.organisationId),
        isNull(visitorWaitQueueEntries.deletedAt),
      ),
    });
    if (!entry) return null;
    const completedId = await this.typeDefs.id("wait_queue_status", "completed");
    if (entry.statusCode === completedId) return { id: entry.id, statusCode: "completed" as const };
    return this.transition(entry.id, "completed", user);
  }

  private async countAhead(
    organisationId: string,
    siteId: string,
    waitingId: string,
    enqueuedAt: Date,
  ): Promise<number> {
    const rows = await this.db.query.visitorWaitQueueEntries.findMany({
      where: and(
        eq(visitorWaitQueueEntries.organisationId, organisationId),
        eq(visitorWaitQueueEntries.siteId, siteId),
        eq(visitorWaitQueueEntries.statusCode, waitingId),
        isNull(visitorWaitQueueEntries.deletedAt),
      ),
    });
    return rows.filter((r) => r.enqueuedAt < enqueuedAt).length;
  }
}
