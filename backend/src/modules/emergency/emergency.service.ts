import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { and, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import {
  VISIT_ROSTER_CHANGED_EVENT,
  VisitRosterChangedEvent,
  type VisitRosterChangeReason,
} from "../../common/domain-events/visit-roster-changed.event";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { emergencyRollCallEntries, emergencyRollCallEvents, visitorVisits } from "../../db/schema";
import { randomUUID } from "node:crypto";

@Injectable()
export class EmergencyService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventEmitter2,
  ) {}

  private emitRosterChanged(event: { organisationId: string; siteId: string }, reason: VisitRosterChangeReason) {
    this.events.emit(
      VISIT_ROSTER_CHANGED_EVENT,
      new VisitRosterChangedEvent(event.organisationId, event.siteId, null, reason),
    );
  }

  // Section 8.6's emergency/evacuation journey: "live on-site visitor
  // roster generated" — this snapshots every currently-open visit at the
  // site the moment the emergency is triggered, so the roster reflects who
  // was actually on site at trigger time, not a query re-run later that
  // could include people who checked in afterward.
  async trigger(siteId: string, user: AuthenticatedUser) {
    const [createdEvent] = await this.db
      .insert(emergencyRollCallEvents)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId,
        activatedBy: user.userId,
      })
      .returning();

    const openVisits = await this.db.query.visitorVisits.findMany({
      where: and(
        eq(visitorVisits.organisationId, user.organisationId),
        eq(visitorVisits.siteId, siteId),
        isNull(visitorVisits.checkedOutAt),
        isNull(visitorVisits.deletedAt),
      ),
    });

    if (openVisits.length > 0) {
      await this.db.insert(emergencyRollCallEntries).values(
        openVisits.map((v) => ({
          id: randomUUID(),
          rollCallEventId: createdEvent.id,
          visitId: v.id,
        })),
      );
    }

    this.emitRosterChanged(createdEvent, "emergency_triggered");
    return { emergencyEvent: createdEvent, rosterSize: openVisits.length };
  }

  async getRoster(emergencyEventId: string, user: AuthenticatedUser) {
    const event = await this.db.query.emergencyRollCallEvents.findFirst({
      where: and(
        eq(emergencyRollCallEvents.id, emergencyEventId),
        eq(emergencyRollCallEvents.organisationId, user.organisationId),
      ),
    });
    if (!event) throw new NotFoundException("Emergency event not found");

    const entries = await this.db.query.emergencyRollCallEntries.findMany({
      where: eq(emergencyRollCallEntries.rollCallEventId, emergencyEventId),
    });

    const visits = await Promise.all(
      entries.map((entry) => this.db.query.visitorVisits.findFirst({ where: eq(visitorVisits.id, entry.visitId) })),
    );

    return { event, roster: visits.filter((v): v is NonNullable<typeof v> => v !== undefined) };
  }

  async resolve(emergencyEventId: string, user: AuthenticatedUser) {
    const [updated] = await this.db
      .update(emergencyRollCallEvents)
      .set({ closedAt: new Date() })
      .where(
        and(
          eq(emergencyRollCallEvents.id, emergencyEventId),
          eq(emergencyRollCallEvents.organisationId, user.organisationId),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException("Emergency event not found");
    this.emitRosterChanged(updated, "emergency_resolved");
    return updated;
  }
}
