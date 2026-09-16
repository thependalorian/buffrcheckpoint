import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNull, lt } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  organisationMembershipStatusLog,
  organisationMemberships,
  privacyRequests,
  privilegedAccessGrants,
  retentionPolicies,
  typeDefinition,
  visitorVisits,
} from "../../db/schema";

// Backs Section 10.5's Compliance Dashboard KPI row. Retention-actions-due
// and offline-sync-exceptions are computed here directly against visit
// rows, since no durable retention/archival job exists yet (Section
// 11.8.2's "not a one-time check" release gate — flagged, not silently
// approximated away) — this is a best-effort read-time count, not the
// eventual job-driven figure.
@Injectable()
export class ComplianceService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async dashboard(user: AuthenticatedUser) {
    const [openDsarCount, roleChangesThisMonth, privilegedAccessEvents, offlineSyncExceptions, retentionActionsDue] =
      await Promise.all([
        this.countOpenDsars(user.organisationId),
        this.countRoleChangesThisMonth(user.organisationId),
        this.countActivePrivilegedAccessGrants(user.organisationId),
        this.countOfflineSyncExceptions(user.organisationId),
        this.countRetentionActionsDue(user.organisationId),
      ]);

    return {
      retentionActionsDue,
      openDeletionRequests: openDsarCount,
      privilegedAccessEvents,
      offlineSyncExceptions,
      roleChangesThisMonth,
    };
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
