import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { auditEvents, visitorVisits } from "../../db/schema";

export interface VisitActivityPoint {
  date: string; // yyyy-MM-dd
  checkIns: number;
  complianceEvents: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Backs the admin app's dashboard-home "Visit Activity" chart. No
// analytics table exists (or should — this is a straightforward
// aggregation of visitor_visits/audit_events, not a new fact table) — real
// counts per day, derived directly from the two tables that already record
// the underlying events, not a fabricated third "visits" series that would
// just duplicate check-ins in this domain (a visit row IS a check-in here).
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async visitActivity(days: number, user: AuthenticatedUser): Promise<VisitActivityPoint[]> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const [visits, events] = await Promise.all([
      this.db.query.visitorVisits.findMany({
        where: and(eq(visitorVisits.organisationId, user.organisationId), gte(visitorVisits.checkedInAt, since)),
        columns: { checkedInAt: true },
      }),
      this.db.query.auditEvents.findMany({
        where: and(eq(auditEvents.organisationId, user.organisationId), gte(auditEvents.occurredAt, since)),
        columns: { occurredAt: true },
      }),
    ]);

    const checkInsByDay = new Map<string, number>();
    for (const v of visits) {
      const key = dayKey(v.checkedInAt);
      checkInsByDay.set(key, (checkInsByDay.get(key) ?? 0) + 1);
    }
    const eventsByDay = new Map<string, number>();
    for (const e of events) {
      const key = dayKey(e.occurredAt);
      eventsByDay.set(key, (eventsByDay.get(key) ?? 0) + 1);
    }

    const points: VisitActivityPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = dayKey(d);
      points.push({
        date: key,
        checkIns: checkInsByDay.get(key) ?? 0,
        complianceEvents: eventsByDay.get(key) ?? 0,
      });
    }
    return points;
  }
}
