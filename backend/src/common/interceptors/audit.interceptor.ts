import { type CallHandler, type ExecutionContext, Inject, Injectable, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Observable } from "rxjs";
import { from, mergeMap, switchMap } from "rxjs";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { appendAuditEvent } from "../audit/audit-chain";
import { AUDIT_LOG_KEY, type AuditLogMetadata } from "../decorators/audit-log.decorator";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

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

    // Fail closed (LG-3): for a write-ahead route the event is written first, and if that write fails the handler never runs.
    if (metadata.writeAhead && user) {
      return from(this.writeAuditEvent(user, metadata, request, undefined)).pipe(switchMap(() => next.handle()));
    }

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
    await appendAuditEvent(this.db, {
      organisationId: user.organisationId,
      actorId: user.userId,
      actionCode: metadata.action,
      resourceType: metadata.resourceType,
      resourceId: (result as { id?: string } | undefined)?.id ?? request.params?.id ?? null,
    });
  }
}
