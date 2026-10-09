import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, inArray, isNull, lt } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  dataDispositionTask,
  deletionRecoveryTombstone,
  organisationMembershipStatusLog,
  organisationMemberships,
  privacyRequestStatusLog,
  privacyRequests,
  privilegedAccessGrants,
  retentionPolicies,
  typeDefinition,
  visitorVisits,
} from "../../db/schema";
import { computeDeletionMetrics, type DeletionMetrics } from "../dsar/deletion-metrics";
import { openRequestDeadlines } from "../dsar/dsar-deadlines";
import { LegalHoldsService } from "../legal-holds/legal-holds.service";

// Backs Section 10.5's Compliance Dashboard KPI row. Retention-actions-due
// and offline-sync-exceptions are computed here directly against visit
// rows, since no durable retention/archival job exists yet (Section
// 11.8.2's "not a one-time check" release gate — flagged, not silently
// approximated away) — this is a best-effort read-time count, not the
// eventual job-driven figure.
@Injectable()
export class ComplianceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly legalHolds: LegalHoldsService,
  ) {}

  async dashboard(user: AuthenticatedUser) {
    const [
      openDsarCount,
      roleChangesThisMonth,
      privilegedAccessEvents,
      offlineSyncExceptions,
      retentionActionsDue,
      deadlines,
      deletion,
    ] = await Promise.all([
      this.countOpenDsars(user.organisationId),
      this.countRoleChangesThisMonth(user.organisationId),
      this.countActivePrivilegedAccessGrants(user.organisationId),
      this.countOfflineSyncExceptions(user.organisationId),
      this.countRetentionActionsDue(user.organisationId),
      openRequestDeadlines(this.db, user.organisationId),
      this.deletionMetrics(user.organisationId),
    ]);

    return {
      retentionActionsDue,
      openDeletionRequests: openDsarCount,
      dataRequestsDueSoon: deadlines.dueSoon,
      dataRequestsOverdue: deadlines.overdue,
      privilegedAccessEvents,
      offlineSyncExceptions,
      roleChangesThisMonth,
      deletion,
    };
  }

  /** Deletion workflow figures for this organisation (DL-19): requests, completion time, tasks, holds and tombstones. */
  async deletionMetrics(organisationId: string): Promise<DeletionMetrics> {
    const requests = await this.db
      .select({
        id: privacyRequests.id,
        createdAt: privacyRequests.createdAt,
        status: typeDefinition.code,
        type: privacyRequests.requestTypeCode,
      })
      .from(privacyRequests)
      .innerJoin(typeDefinition, eq(privacyRequests.statusCode, typeDefinition.id))
      .where(and(eq(privacyRequests.organisationId, organisationId), isNull(privacyRequests.deletedAt)));
    const deletionType = await this.db
      .select({ id: typeDefinition.id })
      .from(typeDefinition)
      .where(and(eq(typeDefinition.domain, "dsar_request_type"), eq(typeDefinition.code, "account_deletion")));
    const typeId = deletionType[0]?.id;
    const own = requests.filter((r) => r.type === typeId);
    const ids = own.map((r) => r.id);

    const [logs, tasks, holds, tombstones] = await Promise.all([
      ids.length === 0
        ? []
        : this.db
            .select({
              requestId: privacyRequestStatusLog.requestId,
              at: privacyRequestStatusLog.occurredAt,
              code: typeDefinition.code,
            })
            .from(privacyRequestStatusLog)
            .innerJoin(typeDefinition, eq(privacyRequestStatusLog.statusCode, typeDefinition.id))
            .where(inArray(privacyRequestStatusLog.requestId, ids))
            .orderBy(asc(privacyRequestStatusLog.occurredAt)),
      this.db
        .select({
          requestId: dataDispositionTask.requestId,
          system: dataDispositionTask.systemCode,
          status: dataDispositionTask.statusCode,
          attemptCount: dataDispositionTask.attemptCount,
        })
        .from(dataDispositionTask)
        .where(and(eq(dataDispositionTask.organisationId, organisationId), isNull(dataDispositionTask.deletedAt))),
      this.legalHolds.activeHoldScopes(organisationId),
      this.db
        .select({ id: deletionRecoveryTombstone.id })
        .from(deletionRecoveryTombstone)
        .where(
          and(
            eq(deletionRecoveryTombstone.organisationId, organisationId),
            isNull(deletionRecoveryTombstone.deletedAt),
            gte(deletionRecoveryTombstone.replayUntil, new Date()),
          ),
        ),
    ]);

    const taskStatusCodes = await this.codes([...new Set(tasks.map((t) => t.status))]);
    const closing = new Set(["completed", "partially_completed"]);
    const closedAt = new Map<string, Date>();
    for (const log of logs)
      if (closing.has(log.code) && !closedAt.has(log.requestId)) closedAt.set(log.requestId, log.at);

    return computeDeletionMetrics(
      own.map((r) => ({ id: r.id, createdAt: r.createdAt, status: r.status, closedAt: closedAt.get(r.id) ?? null })),
      tasks.map((t) => ({
        requestId: t.requestId,
        system: t.system,
        status: taskStatusCodes.get(t.status) ?? "unknown",
        attemptCount: t.attemptCount,
      })),
      holds.length,
      tombstones.length,
    );
  }

  private async codes(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: typeDefinition.id, code: typeDefinition.code })
      .from(typeDefinition)
      .where(inArray(typeDefinition.id, ids));
    return new Map(rows.map((r) => [r.id, r.code]));
  }

  private async countOpenDsars(organisationId: string): Promise<number> {
    const rows = await this.db
      .select({ statusCode: typeDefinition.code })
      .from(privacyRequests)
      .innerJoin(typeDefinition, eq(privacyRequests.statusCode, typeDefinition.id))
      .where(and(eq(privacyRequests.organisationId, organisationId), isNull(privacyRequests.deletedAt)));
    return rows.filter((r) => r.statusCode === "pending" || r.statusCode === "in_review").length;
  }

  private async countRoleChangesThisMonth(organisationId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const rows = await this.db
      .select({ id: organisationMembershipStatusLog.id })
      .from(organisationMembershipStatusLog)
      .innerJoin(organisationMemberships, eq(organisationMembershipStatusLog.membershipId, organisationMemberships.id))
      .where(
        and(
          eq(organisationMemberships.organisationId, organisationId),
          gte(organisationMembershipStatusLog.occurredAt, startOfMonth),
        ),
      );
    return rows.length;
  }

  // Section 9.2 rule 4: platform_support's break-glass access is
  // "exceptional, time-bound... fully logged" — an active grant right now
  // is exactly the kind of privileged-access event this KPI exists to
  // surface.
  private async countActivePrivilegedAccessGrants(organisationId: string): Promise<number> {
    const now = new Date();
    const rows = await this.db.query.privilegedAccessGrants.findMany({
      where: and(
        eq(privilegedAccessGrants.organisationId, organisationId),
        isNull(privilegedAccessGrants.revokedAt),
        isNull(privilegedAccessGrants.deletedAt),
        lt(privilegedAccessGrants.startsAt, now),
        gte(privilegedAccessGrants.expiresAt, now),
      ),
    });
    return rows.length;
  }

  // Section 8.5: a visit captured offline that has not yet reached
  // server_accepted_at is a sync exception worth surfacing, not silent.
  private async countOfflineSyncExceptions(organisationId: string): Promise<number> {
    const rows = await this.db.query.visitorVisits.findMany({
      where: and(
        eq(visitorVisits.organisationId, organisationId),
        eq(visitorVisits.offlineCaptured, true),
        isNull(visitorVisits.serverAcceptedAt),
        isNull(visitorVisits.deletedAt),
      ),
    });
    return rows.length;
  }

  // Best-effort: a checked-out visit whose age already exceeds its site's
  // (or the organisation default's) *current* retention_days is due for a
  // retention action. Does not account for legal holds (Section 8.9) — a
  // held record would still surface here until the retention job (not yet
  // built) cross-checks legal_hold before acting.
  private async countRetentionActionsDue(organisationId: string): Promise<number> {
    const policies = await this.db.query.retentionPolicies.findMany({
      where: and(eq(retentionPolicies.organisationId, organisationId), isNull(retentionPolicies.deletedAt)),
    });
    if (policies.length === 0) return 0;

    const currentBySite = new Map<string, number>(); // siteId ("" = org default) -> highest-version retentionDays
    const versionBySite = new Map<string, number>();
    for (const p of policies) {
      const key = p.siteId ?? "";
      if (!versionBySite.has(key) || p.version > (versionBySite.get(key) ?? 0)) {
        versionBySite.set(key, p.version);
        currentBySite.set(key, p.retentionDays);
      }
    }
    const orgDefaultDays = currentBySite.get("");

    const checkedOutVisits = await this.db.query.visitorVisits.findMany({
      where: and(eq(visitorVisits.organisationId, organisationId), isNull(visitorVisits.deletedAt)),
    });

    const now = Date.now();
    let dueCount = 0;
    for (const v of checkedOutVisits) {
      if (!v.checkedOutAt) continue;
      const retentionDays = currentBySite.get(v.siteId) ?? orgDefaultDays;
      if (retentionDays === undefined) continue;
      const ageMs = now - new Date(v.checkedOutAt).getTime();
      if (ageMs > retentionDays * 24 * 60 * 60 * 1000) dueCount += 1;
    }
    return dueCount;
  }
}
