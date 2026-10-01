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
// The concurrency limitation documented on AuditInterceptor applies here
// too: the read-previous-then-insert is not serialized across concurrent
// writers for the same organisation.

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

export async function appendAuditEvent(db: Database, input: AppendAuditEventInput): Promise<void> {
  const previous = await db.query.auditEvents.findFirst({
    where: eq(auditEvents.organisationId, input.organisationId),
    orderBy: [desc(auditEvents.occurredAt)],
  });

  const occurredAt = new Date();
  const prevEventHash = previous?.eventHash ?? null;
  const eventHash = computeAuditEventHash({ ...input, occurredAt, prevEventHash });

  await db.insert(auditEvents).values({
    id: randomUUID(),
    ...input,
    occurredAt,
    prevEventHash,
    eventHash,
  });
}
