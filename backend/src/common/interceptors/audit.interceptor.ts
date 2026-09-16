import { type CallHandler, type ExecutionContext, Inject, Injectable, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { desc, eq } from "drizzle-orm";
import type { Observable } from "rxjs";
import { from, mergeMap } from "rxjs";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { auditEvents } from "../../db/schema";
import { AUDIT_LOG_KEY, type AuditLogMetadata } from "../decorators/audit-log.decorator";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";
import { createHash, randomUUID } from "node:crypto";

// Section 9.2 rule 3: "Every sensitive read, export, correction, and
// deletion must create an immutable audit event." The chain is
// hash-linked (Section 11.2's "hash-linked event chain") — each row's
// eventHash covers its own payload plus the previous row's hash, so any
// row tampered with after the fact breaks the chain for every row after it.
//
// KNOWN LIMITATION, not silently glossed over: the write below is awaited
// inside the request's own response cycle (fixed from an earlier `void`
// fire-and-forget that let a fast retry read a stale "previous event" and
// break the chain — caught by AuditService.verifyChainIntegrity during
// testing). That fixes strictly sequential calls. It does NOT fix two
// truly concurrent requests for the same organisation racing the
// read-then-insert — the Neon HTTP driver (drizzle-orm/neon-http) has no
// session-based row locking (no SELECT ... FOR UPDATE, no interactive
// transaction) to serialize that. A real fix needs either a per-organisation
// Postgres advisory lock (pg_advisory_xact_lock) via a session-based driver
// (drizzle-orm/neon-serverless over the WebSocket Pool, not neon-http), or
// a single-writer queue in front of this table. Flagged here rather than
// claimed as solved.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditLogMetadata | undefined>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    return next.handle().pipe(
      mergeMap((result: unknown) => {
        if (!user) return from(Promise.resolve(result)); // unauthenticated routes are never audit-logged as user actions
        return from(this.writeAuditEvent(user, metadata, request, result).then(() => result));
      }),
    );
  }

  private async writeAuditEvent(
    user: AuthenticatedUser,
    metadata: AuditLogMetadata,
    request: { params?: Record<string, string> },
    result: unknown,
  ): Promise<void> {
    const previous = await this.db.query.auditEvents.findFirst({
      where: eq(auditEvents.organisationId, user.organisationId),
      orderBy: [desc(auditEvents.occurredAt)],
    });

    const resourceId = (result as { id?: string })?.id ?? request.params?.id ?? null;
    const occurredAt = new Date();
    const prevEventHash = previous?.eventHash ?? null;

    const payload: string = JSON.stringify({
      organisationId: user.organisationId,
      actorId: user.userId,
      actionCode: metadata.action,
      resourceType: metadata.resourceType,
      resourceId,
      occurredAt: occurredAt.toISOString(),
      prevEventHash,
    });
    const eventHash: string = createHash("sha256").update(payload).digest("hex");

    await this.db.insert(auditEvents).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      actorId: user.userId,
      actionCode: metadata.action,
      resourceType: metadata.resourceType,
      resourceId,
      occurredAt,
      prevEventHash,
      eventHash,
    });
  }
}
