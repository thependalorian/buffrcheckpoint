import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, inArray, lt, lte, or, type SQL } from "drizzle-orm";

import { type AppendAuditEventInput, appendAuditEvent, verifyChain } from "../../common/audit/audit-chain";
import { loadLegacyForkHeads } from "../../common/audit/legacy-forks";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { TabularExport } from "../../common/export/tabular";
import { clampPageSize } from "../../common/pagination/page-size";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { applicationUsers, auditEvents } from "../../db/schema";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_EXPORT_ROWS = 10_000;

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
    const limit = clampPageSize(input.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
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

  /**
   * Audit log as a table for CSV/XLSX download: newest first, capped at
   * MAX_EXPORT_ROWS, actor shown as an email (or "system"). The hash columns
   * let an auditor check the chain outside the product.
   */
  async exportForOrganisation(
    user: AuthenticatedUser,
    input: { from?: string; to?: string } = {},
  ): Promise<TabularExport> {
    const conditions: SQL[] = [eq(auditEvents.organisationId, user.organisationId)];
    if (input.from) conditions.push(gte(auditEvents.occurredAt, new Date(input.from)));
    if (input.to) conditions.push(lte(auditEvents.occurredAt, new Date(input.to)));
    const rows = await this.db.query.auditEvents.findMany({
      where: and(...conditions),
      orderBy: [desc(auditEvents.occurredAt), desc(auditEvents.id)],
      limit: MAX_EXPORT_ROWS,
    });
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter((id): id is string => Boolean(id)))];
    const actors = actorIds.length
      ? await this.db
          .select({ id: applicationUsers.id, email: applicationUsers.email })
          .from(applicationUsers)
          .where(inArray(applicationUsers.id, actorIds))
      : [];
    const emailById = new Map(actors.map((a) => [a.id, a.email]));
    return {
      headers: ["occurred_at", "actor", "action", "resource_type", "resource_id", "event_hash", "prev_event_hash"],
      rows: rows.map((r) => [
        r.occurredAt.toISOString(),
        r.actorId ? (emailById.get(r.actorId) ?? r.actorId) : "system",
        r.actionCode,
        r.resourceType,
        r.resourceId ?? null,
        r.eventHash ?? null,
        r.prevEventHash ?? null,
      ]),
    };
  }

  // System-initiated events (workers, gateway callbacks) that have no
  // request user to hang an @AuditLog interceptor off.
  append(input: AppendAuditEventInput) {
    return appendAuditEvent(this.db, input);
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
    // Followed by links, not by timestamps: events written in the same millisecond tie on time.
    return verifyChain(events, await loadLegacyForkHeads(this.db));
  }
}
