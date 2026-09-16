import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lt, lte, or, type SQL } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { auditEvents } from "../../db/schema";
import { createHash } from "node:crypto";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export interface ListAuditEventsInput {
  from?: string;
  to?: string;
  limit?: number;
  // Keyset cursor from the previous page's last row (occurredAt, id) —
  // audit_events is append-only and ordered by occurredAt desc, so a
  // classic OFFSET would skip/duplicate rows whenever a new event is
  // written between page fetches. `${occurredAt.toISOString()}_${id}`.
  cursor?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Section 8.10's admin/compliance review journey — "pulls the audit log
  // for a chosen date range." Section 11.8.1's pagination gap, closed:
  // real date-range filtering plus keyset pagination over the hash-linked
  // read path, not just the most recent 200 rows.
  async listForOrganisation(user: AuthenticatedUser, input: ListAuditEventsInput = {}) {
    const limit = Math.min(input.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const conditions: SQL[] = [eq(auditEvents.organisationId, user.organisationId)];

    if (input.from) conditions.push(gte(auditEvents.occurredAt, new Date(input.from)));
    if (input.to) conditions.push(lte(auditEvents.occurredAt, new Date(input.to)));

    if (input.cursor) {
      const separatorIndex = input.cursor.lastIndexOf("_");
      const cursorOccurredAt = new Date(input.cursor.slice(0, separatorIndex));
      const cursorId = input.cursor.slice(separatorIndex + 1);
      const cursorCondition = or(
        lt(auditEvents.occurredAt, cursorOccurredAt),
        and(eq(auditEvents.occurredAt, cursorOccurredAt), lt(auditEvents.id, cursorId)),
      );
      if (cursorCondition) conditions.push(cursorCondition);
    }

    const rows = await this.db.query.auditEvents.findMany({
      where: and(...conditions),
      orderBy: [desc(auditEvents.occurredAt), desc(auditEvents.id)],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);
    const nextCursor = hasMore && last ? `${last.occurredAt.toISOString()}_${last.id}` : null;

    return { events: page, nextCursor };
  }

  // Verifies the hash chain hasn't been tampered with — each row's
  // eventHash must match a fresh hash of its own fields + the previous
  // row's hash. Section 20.2's "annual control-effectiveness report" is
  // exactly this check, run and reported on.
  async verifyChainIntegrity(user: AuthenticatedUser): Promise<{ valid: boolean; brokenAtEventId: string | null }> {
    const events = await this.db.query.auditEvents.findMany({
      where: eq(auditEvents.organisationId, user.organisationId),
      orderBy: [auditEvents.occurredAt],
    });

    let expectedPrevHash: string | null = null;

    for (const event of events) {
      if (event.prevEventHash !== expectedPrevHash) {
        return { valid: false, brokenAtEventId: event.id };
      }
      const payload: string = JSON.stringify({
        organisationId: event.organisationId,
        actorId: event.actorId,
        actionCode: event.actionCode,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        occurredAt: event.occurredAt.toISOString(),
        prevEventHash: event.prevEventHash,
      });
      const recomputed: string = createHash("sha256").update(payload).digest("hex");
      if (recomputed !== event.eventHash) {
        return { valid: false, brokenAtEventId: event.id };
      }
      expectedPrevHash = event.eventHash;
    }

    return { valid: true, brokenAtEventId: null };
  }
}
