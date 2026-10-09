import { BadRequestException, Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import { markCredentialsChanged } from "../../common/auth/credential-revocation";
import { sessionCache } from "../../common/auth/session-cache";
import { assertFreshSession } from "../../common/auth/step-up";
import { requiredSecret } from "../../common/crypto/required-secret";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import {
  applicationUsers,
  dataDispositionTask,
  dataDispositionTaskStatusLog,
  deletionRecoveryTombstone,
  privacyRequestStatusLog,
  privacyRequests,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { RefreshTokenService } from "../auth/refresh-token.service";
import { LegalHoldsService } from "../legal-holds/legal-holds.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import {
  DEFAULT_REPLAY_DAYS,
  type DispositionAction,
  type DispositionSystem,
  holdBlocksDeletion,
  type PlannedTask,
  planAccountDeletion,
  type RetentionBasis,
  replayUntil,
  requestOutcome,
  type TaskStatus,
  taskKey,
} from "./deletion-plan";
import {
  type DispositionStore,
  type DispositionTaskRow,
  type HandlerResult,
  runDueTasks,
  type TaskHandler,
} from "./disposition-executor";
import { createHmac, randomUUID } from "node:crypto";

type RequestRow = typeof privacyRequests.$inferSelect;

/** Plain account of the outcome: what was erased, and that some records are kept on purpose. Never claims everything is gone. */
export const ACCOUNT_CLOSED_NOTICE = {
  subject: "Your Buffr Checkpoint account has been closed",
  body: [
    "Your account has been closed and the personal details tied to it have been erased or anonymised.",
    "We keep only the records we are required or justified to keep, such as billing records and audit events. Those records are restricted to the people who need them and are removed when their retention period ends.",
    "If you did not ask for this, reply to this email straight away.",
  ].join("\n\n"),
};

/**
 * What completing an account-deletion request does to the user row: the person's identifiers and credential material are erased,
 * not just flagged. The id stays (audit events and status logs join on it) and the row is soft-deleted. The placeholder email keeps
 * the unique (organisation, email) index satisfied and can never receive mail (.invalid is reserved).
 */
export function erasedUserFields(now: Date) {
  return {
    email: sql<string>`'erased-' || ${applicationUsers.id}::text || '@erased.invalid'`,
    passwordHash: null,
    mfaEnabled: false,
    mfaSecretReference: null,
    buffrIdSubject: null,
    lockedUntil: null,
    deletedAt: now,
  };
}

/** The placeholder address an erased account carries. It can never receive mail (.invalid is reserved). */
export function erasedEmail(userId: string): string {
  return `erased-${userId}@erased.invalid`;
}

/**
 * Account deletion as a workflow (blueprint 8.7, DL-2 to DL-10): accept the request (fresh sign-in, legal holds first, access frozen
 * at once), run one idempotent task per system with retries and a review queue, write a recovery tombstone, and report the outcome
 * honestly. Financial and audit records are kept and restricted (DL-8), never deleted to satisfy the request.
 */
@Injectable()
export class AccountDeletionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountDeletionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly legalHolds: LegalHoldsService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

  /** Resumes tasks whose retry time has come, every five minutes. Off in tests. */
  onModuleInit(): void {
    if (process.env.NODE_ENV === "test" || process.env.ACCOUNT_DELETION_WORKER_ENABLED === "false") return;
    this.timer = setInterval(
      () => {
        this.resumeDue().catch((error: unknown) => this.logger.error(`Deletion resume failed: ${String(error)}`));
      },
      5 * 60 * 1000,
    );
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Accepts a deletion request. Requires a fresh sign-in (DL-3). A matching legal hold puts the request on hold and changes nothing
   * else (DL-17). Otherwise the account is frozen at once: it is marked closing, older tokens are refused and refresh tokens are
   * revoked (DL-5), and the per-system tasks are created.
   */
  async accept(request: RequestRow, actor: AuthenticatedUser): Promise<"scheduled" | "on_hold" | "already_accepted"> {
    assertFreshSession(actor);
    const status = await this.typeDefs.codeById(request.statusCode);
    if (status && ["scheduled", "in_progress", "waiting_for_processors", "partially_completed"].includes(status)) {
      return "already_accepted";
    }
    const user = await this.findSubject(request);
    const holds = await this.legalHolds.activeHoldScopes(request.organisationId);
    if (holdBlocksDeletion(holds, { reference: request.subjectReference, userId: user?.id ?? null })) {
      await this.setRequestStatus(request, "on_hold", actor.userId, "legal hold applies");
      return "on_hold";
    }
    if (user) {
      await this.db
        .update(applicationUsers)
        .set({ statusCode: await this.typeDefs.id("application_user_status", "closing") })
        .where(and(eq(applicationUsers.id, user.id), eq(applicationUsers.organisationId, request.organisationId)));
      await markCredentialsChanged(this.db, user.id);
      await this.refreshTokens.revokeAllForUser(request.organisationId, user.id, "deletion_accepted");
    }
    await this.store(request.organisationId).ensureTasks(request.id, planAccountDeletion());
    await this.setRequestStatus(request, "scheduled", actor.userId, "deletion accepted, access ended");
    return "scheduled";
  }

  /** Runs the due tasks and records the request status that follows from them. */
  async run(request: RequestRow, actorId: string | null): Promise<"completed" | "in_progress" | "partially_completed"> {
    const store = this.store(request.organisationId);
    const user = await this.findSubject(request);
    const statuses = await runDueTasks(store, this.handlers(request, user?.id ?? null), request.id, new Date());
    const outcome = requestOutcome(statuses);
    const reason =
      outcome === "completed"
        ? "all tasks finished"
        : outcome === "partially_completed"
          ? "a task needs review"
          : "tasks are still running or waiting to retry";
    await this.setRequestStatus(request, outcome, actorId, reason);
    return outcome;
  }

  /** Re-runs requests that have tasks waiting to retry. Safe to call repeatedly. */
  async resumeDue(now: Date = new Date()): Promise<number> {
    const retry = await this.typeDefs.id("disposition_task_status", "retry_scheduled");
    const due = await this.db
      .select({ requestId: dataDispositionTask.requestId, organisationId: dataDispositionTask.organisationId })
      .from(dataDispositionTask)
      .where(
        and(
          eq(dataDispositionTask.statusCode, retry),
          lte(dataDispositionTask.nextAttemptAt, now),
          isNull(dataDispositionTask.deletedAt),
        ),
      );
    const pairs = [...new Map(due.map((row) => [`${row.organisationId}:${row.requestId}`, row])).values()];
    for (const { requestId, organisationId } of pairs) {
      const request = await this.db.query.privacyRequests.findFirst({
        where: and(eq(privacyRequests.id, requestId), eq(privacyRequests.organisationId, organisationId)),
      });
      if (request) await this.run(request, null);
    }
    return pairs.length;
  }

  /** Puts a frozen account back in service when its deletion request is rejected or cancelled. */
  async release(request: RequestRow): Promise<void> {
    const user = await this.findSubject(request);
    if (!user) return;
    await this.db
      .update(applicationUsers)
      .set({ statusCode: await this.typeDefs.id("application_user_status", "active") })
      .where(and(eq(applicationUsers.id, user.id), eq(applicationUsers.organisationId, request.organisationId)));
    sessionCache.invalidateUser(user.id);
  }

  private async findSubject(request: RequestRow): Promise<{ id: string } | undefined> {
    // After erasure the request holds the placeholder address; the user row is then found through it.
    const [row] = await this.db
      .select({ id: applicationUsers.id })
      .from(applicationUsers)
      .where(
        and(
          eq(applicationUsers.organisationId, request.organisationId),
          sql`lower(${applicationUsers.email}) = lower(${request.subjectReference})`,
        ),
      );
    return row;
  }

  private async setRequestStatus(
    request: RequestRow,
    code: string,
    actorId: string | null,
    reason: string,
  ): Promise<void> {
    const statusCode = await this.typeDefs.id("dsar_status", code);
    const current = await this.db.query.privacyRequests.findFirst({ where: eq(privacyRequests.id, request.id) });
    if (current?.statusCode === statusCode) return;
    await this.db
      .update(privacyRequests)
      .set({ statusCode })
      .where(and(eq(privacyRequests.id, request.id), eq(privacyRequests.organisationId, request.organisationId)));
    await this.db.insert(privacyRequestStatusLog).values({
      id: randomUUID(),
      requestId: request.id,
      statusCode,
      occurredAt: new Date(),
      actorId,
      reason,
    });
  }

  private handlers(request: RequestRow, userId: string | null): Record<DispositionSystem, TaskHandler> {
    const organisationId = request.organisationId;
    const done = async (): Promise<HandlerResult> => ({ outcome: "completed" });
    return {
      credentials_and_sessions: async () => {
        if (userId) {
          await markCredentialsChanged(this.db, userId);
          await this.refreshTokens.revokeAllForUser(organisationId, userId, "deletion_task");
          await this.db
            .update(applicationUsers)
            .set({ passwordHash: null })
            .where(and(eq(applicationUsers.id, userId), eq(applicationUsers.organisationId, organisationId)));
        }
        return done();
      },
      notification_outbox: async () => {
        // The address is still readable here: this task runs before the profile is erased.
        await this.db.execute(sql`
          UPDATE notification_delivery_instructions
          SET recipient_reference = 'redacted', message = '', html = NULL, attachments_json = NULL, subject = NULL, failure_reason = NULL
          WHERE organisation_id = ${organisationId}::uuid AND lower(recipient_reference) = lower(${request.subjectReference})`);
        return done();
      },
      application_user_profile: async () => {
        if (!userId) return done();
        const original = request.subjectReference;
        await this.db
          .update(applicationUsers)
          .set(erasedUserFields(new Date()))
          .where(and(eq(applicationUsers.id, userId), eq(applicationUsers.organisationId, organisationId)));
        await this.writeTombstone(request, userId);
        await this.db
          .update(privacyRequests)
          .set({ subjectReference: erasedEmail(userId) })
          .where(and(eq(privacyRequests.id, request.id), eq(privacyRequests.organisationId, organisationId)));
        sessionCache.invalidateUser(userId);
        await this.sendClosureNotice(original, organisationId);
        return done();
      },
      billing_records: async () => ({
        outcome: "retained",
        externalReference:
          "kept as a financial record, restricted to billing roles; the retention period is confirmed with counsel",
      }),
      audit_chain: async () => {
        await appendAuditEvent(this.db, {
          organisationId,
          actorId: null,
          actionCode: "account_deletion.completed",
          resourceType: "privacy_request",
          resourceId: request.id,
        });
        return {
          outcome: "retained",
          externalReference: "kept so the audit chain stays verifiable; holds references, not profile data",
        };
      },
      processors: async () => ({
        outcome: "not_applicable",
        externalReference:
          "providers hold only what the database held; their copies expire with backups and the recovery tombstone replays the erasure",
      }),
    };
  }

  private async writeTombstone(request: RequestRow, userId: string): Promise<void> {
    const pepper = requiredSecret("DELETION_TOMBSTONE_PEPPER", "dev-only-deletion-tombstone-pepper");
    const erasedAt = new Date();
    await this.db
      .insert(deletionRecoveryTombstone)
      .values({
        id: randomUUID(),
        organisationId: request.organisationId,
        requestId: request.id,
        subjectHmac: createHmac("sha256", pepper).update(userId).digest("hex"),
        erasedAt,
        replayUntil: replayUntil(erasedAt, Number(process.env.DELETION_REPLAY_DAYS ?? DEFAULT_REPLAY_DAYS)),
      })
      .onConflictDoNothing();
  }

  /** Tells the person what was done and what was kept. A mail failure never undoes or blocks the erasure. */
  private async sendClosureNotice(to: string, organisationId: string): Promise<void> {
    try {
      await this.templatedEmail.send({
        templateCode: "account_deletion_completed",
        organisationId,
        to,
        variables: {},
        fallback: ACCOUNT_CLOSED_NOTICE,
      });
    } catch (error) {
      this.logger.warn(
        `Account closure notice not queued: ${error instanceof Error ? error.constructor.name : "unknown error"}`,
      );
    }
  }

  private store(organisationId: string): DispositionStore {
    const typeDefs = this.typeDefs;
    const db = this.db;
    return {
      async ensureTasks(requestId: string, planned: PlannedTask[]) {
        const request = await db.query.privacyRequests.findFirst({
          where: and(eq(privacyRequests.id, requestId), eq(privacyRequests.organisationId, organisationId)),
        });
        if (!request) throw new BadRequestException("Request not found");
        const pending = await typeDefs.id("disposition_task_status", "pending");
        for (const task of planned) {
          const existing = await db.query.dataDispositionTask.findFirst({
            where: and(
              eq(dataDispositionTask.organisationId, request.organisationId),
              eq(dataDispositionTask.idempotencyKey, taskKey(requestId, task.system)),
              isNull(dataDispositionTask.deletedAt),
            ),
          });
          if (existing) continue;
          const id = randomUUID();
          await db.insert(dataDispositionTask).values({
            id,
            organisationId: request.organisationId,
            requestId,
            systemCode: await typeDefs.id("disposition_system", task.system),
            actionCode: await typeDefs.id("disposition_action", task.action),
            statusCode: pending,
            retentionBasisCode: task.retentionBasis ? await typeDefs.id("retention_basis", task.retentionBasis) : null,
            idempotencyKey: taskKey(requestId, task.system),
          });
          await db.insert(dataDispositionTaskStatusLog).values({
            id: randomUUID(),
            organisationId: request.organisationId,
            taskId: id,
            fromStatusCode: null,
            toStatusCode: pending,
            reasonCode: "planned",
          });
        }
      },
      async tasksFor(requestId: string): Promise<DispositionTaskRow[]> {
        const rows = await db
          .select()
          .from(dataDispositionTask)
          .where(
            and(
              eq(dataDispositionTask.organisationId, organisationId),
              eq(dataDispositionTask.requestId, requestId),
              isNull(dataDispositionTask.deletedAt),
            ),
          )
          .orderBy(asc(dataDispositionTask.createdAt));
        const result: DispositionTaskRow[] = [];
        for (const row of rows) {
          result.push({
            id: row.id,
            system: (await typeDefs.codeById(row.systemCode)) as DispositionSystem,
            action: (await typeDefs.codeById(row.actionCode)) as DispositionAction,
            status: (await typeDefs.codeById(row.statusCode)) as TaskStatus,
            attemptCount: row.attemptCount,
            nextAttemptAt: row.nextAttemptAt,
            retentionBasis: row.retentionBasisCode
              ? ((await typeDefs.codeById(row.retentionBasisCode)) as RetentionBasis)
              : null,
          });
        }
        // Plan order, not insertion time: the tasks of one request are created together, so sort by the plan.
        const order = planAccountDeletion().map((p) => p.system);
        return result.sort((a, b) => order.indexOf(a.system) - order.indexOf(b.system));
      },
      async transition(taskId, to, reasonCode, patch = {}) {
        const row = await db.query.dataDispositionTask.findFirst({
          where: and(eq(dataDispositionTask.id, taskId), eq(dataDispositionTask.organisationId, organisationId)),
        });
        if (!row) return;
        const toId = await typeDefs.id("disposition_task_status", to);
        await db
          .update(dataDispositionTask)
          .set({
            statusCode: toId,
            ...(patch.attemptCount === undefined ? {} : { attemptCount: patch.attemptCount }),
            ...(patch.lastError === undefined ? {} : { lastError: patch.lastError }),
            ...(patch.nextAttemptAt === undefined ? {} : { nextAttemptAt: patch.nextAttemptAt }),
            ...(patch.externalReference === undefined ? {} : { externalReference: patch.externalReference }),
          })
          .where(and(eq(dataDispositionTask.id, taskId), eq(dataDispositionTask.organisationId, row.organisationId)));
        await db.insert(dataDispositionTaskStatusLog).values({
          id: randomUUID(),
          organisationId: row.organisationId,
          taskId,
          fromStatusCode: row.statusCode,
          toStatusCode: toId,
          reasonCode,
        });
      },
    };
  }
}
