import { desc, eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import { auditEvents } from "../../db/schema";
import { createHash, randomUUID } from "node:crypto";

// The one definition of the audit hash chain (Section 11.2's "hash-linked
// event chain"). AuditInterceptor writes user-initiated events through
// appendAuditEvent; background workers and gateway callbacks, which have no
// request user, call it with actorId null. AuditService.verifyChainIntegrity
// recomputes with computeAuditEventHash, so writer and verifier cannot drift.
//
// Concurrent writers for one organisation are serialised by a unique index
// (migration 0057) plus the retry in appendAuditEvent, not by a lock.

export interface AuditEventHashInput {
  organisationId: string;
  actorId: string | null;
  actionCode: string;
  resourceType: string;
  resourceId: string | null;
  occurredAt: Date;
  prevEventHash: string | null;
}

export function computeAuditEventHash(input: AuditEventHashInput): string {
  const payload: string = JSON.stringify({
    organisationId: input.organisationId,
    actorId: input.actorId,
    actionCode: input.actionCode,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    occurredAt: input.occurredAt.toISOString(),
    prevEventHash: input.prevEventHash,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export interface AppendAuditEventInput {
  organisationId: string;
  actorId: string | null;
  actionCode: string;
  resourceType: string;
  resourceId: string | null;
}

const MAX_APPEND_ATTEMPTS = 6;
/** How many of the newest events are looked at to find the tip. Timestamps can tie, so the newest one alone is not enough. */
const TIP_WINDOW = 50;

interface ChainLink {
  eventHash: string;
  prevEventHash: string | null;
}

/**
 * The end of the chain among the newest events: the one no other event names as its predecessor. Ordering by time alone is not safe:
 * two events written in the same millisecond tie, and then "the newest" can be the older of the two, which made every retry point at
 * a predecessor that already had a successor. The unique index guarantees at most one successor, so the unreferenced event is the tip.
 * Input is newest first; it falls back to the newest event only when the window holds no unreferenced one.
 */
export function chainTip<T extends ChainLink>(newestFirst: T[]): T | undefined {
  const referenced = new Set(newestFirst.map((e) => e.prevEventHash).filter((h): h is string => h !== null));
  return newestFirst.find((e) => !referenced.has(e.eventHash)) ?? newestFirst[0];
}

/**
 * Walks an organisation's whole chain by its links, not its timestamps. Returns the first event that cannot be placed, if any: a second
 * successor to one event (a fork), a hash that does not match its content, or an event the walk never reaches.
 */
export function verifyChain<T extends ChainLink & AuditEventHashInput & { id: string }>(
  events: T[],
): { valid: boolean; brokenAtEventId: string | null } {
  const byPrev = new Map<string, T[]>();
  for (const event of events) {
    const key = event.prevEventHash ?? "";
    byPrev.set(key, [...(byPrev.get(key) ?? []), event]);
  }
  let expected = "";
  let visited = 0;
  for (;;) {
    const next = byPrev.get(expected);
    if (!next || next.length === 0) break;
    if (next.length > 1) return { valid: false, brokenAtEventId: next[1].id };
    const event = next[0];
    if (computeAuditEventHash(event) !== event.eventHash) return { valid: false, brokenAtEventId: event.id };
    visited++;
    expected = event.eventHash;
  }
  if (visited < events.length) {
    const reached = new Set<string>();
    let cursor = "";
    for (;;) {
      const next = byPrev.get(cursor)?.[0];
      if (!next) break;
      reached.add(next.id);
      cursor = next.eventHash;
    }
    return { valid: false, brokenAtEventId: events.find((e) => !reached.has(e.id))?.id ?? null };
  }
  return { valid: true, brokenAtEventId: null };
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Appends one event to the organisation's chain. Two writers that read the same previous hash would fork the chain; since migration
 * 0057 the database refuses the second one (a unique index on the organisation and previous hash), and this loop re-reads the new
 * tip and tries again. The chain therefore stays a single line without a lock or an interactive transaction.
 */
export async function appendAuditEvent(db: Database, input: AppendAuditEventInput): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const recent = await db.query.auditEvents.findMany({
      where: eq(auditEvents.organisationId, input.organisationId),
      orderBy: [desc(auditEvents.occurredAt)],
      limit: TIP_WINDOW,
    });
    const previous = chainTip(recent);

    const occurredAt = new Date();
    const prevEventHash = previous?.eventHash ?? null;
    const eventHash = computeAuditEventHash({ ...input, occurredAt, prevEventHash });

    try {
      await db.insert(auditEvents).values({ id: randomUUID(), ...input, occurredAt, prevEventHash, eventHash });
      return;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= MAX_APPEND_ATTEMPTS) throw error;
    }
  }
}
