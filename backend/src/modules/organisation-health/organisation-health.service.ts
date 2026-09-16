import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  deviceOperationalStatusLog,
  managedKioskDevices,
  notificationDeliveryInstructions,
  organisationHealthSnapshot,
  organisations,
  organisationSubscription,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { type HealthScoreWeights, PlatformConfigurationService } from "../platform-configuration/platform-configuration.service";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * v1 churn/health scorecard — a transparent weighted heuristic, not a
 * trained classifier (per Data Science for Business's own guidance: start
 * interpretable, avoid modeling on a dataset with no labeled churn events
 * yet — the leakage/overfitting risk on a handful of examples isn't worth
 * it, and ops staff need to see *why* a score is high, not just a number).
 * v2 (documented, not built): once organisation_health_snapshot has
 * accumulated real churn/downgrade-labeled history, swap this for logistic
 * regression or a random-forest classifier, evaluated on precision/recall
 * (not accuracy, since churn is a rare-event class) over a held-out
 * *future* time slice.
 */
@Injectable()
export class OrganisationHealthService {
  private readonly logger = new Logger(OrganisationHealthService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly configuration: PlatformConfigurationService,
  ) {}

  async computeAllSnapshots(): Promise<number> {
    const orgs = await this.db.query.organisations.findMany({ where: isNull(organisations.deletedAt) });
    let written = 0;
    for (const org of orgs) {
      await this.computeSnapshotForOrganisation(org.id);
      written++;
    }
    this.logger.log(`Computed ${written} organisation health snapshots`);
    return written;
  }

  async computeSnapshotForOrganisation(organisationId: string) {
    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - WEEK_MS);
    const lastWeekStart = new Date(now.getTime() - 2 * WEEK_MS);

    const [thisWeekVisits, lastWeekVisits] = await Promise.all([
      this.countVisits(organisationId, thisWeekStart, now),
      this.countVisits(organisationId, lastWeekStart, thisWeekStart),
    ]);
    const visitVolumeTrend = lastWeekVisits === 0 ? (thisWeekVisits > 0 ? 1 : 0) : (thisWeekVisits - lastWeekVisits) / lastWeekVisits;

    const lastLogin = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.organisationId, organisationId), isNull(applicationUsers.deletedAt)),
      orderBy: desc(applicationUsers.lastLoginAt),
    });
    const adminLoginRecencyDays = lastLogin?.lastLoginAt
      ? Math.floor((now.getTime() - lastLogin.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const notificationFailureRate = await this.notificationFailureRate(organisationId, thisWeekStart);
    const deviceOfflineRate = await this.deviceOfflineRate(organisationId);

    const weights = await this.configuration.healthScoreWeights();
    const healthScore = this.scoreFrom(
      {
        visitVolumeTrend,
        adminLoginRecencyDays,
        notificationFailureRate,
        deviceOfflineRate,
      },
      weights,
    );
    const band =
      healthScore >= weights.lowRiskBandFloor ? "low" : healthScore >= weights.mediumRiskBandFloor ? "medium" : "high";
    const churnRiskBandCode = await this.typeDefs.id("churn_risk_band", band);

    const [row] = await this.db
      .insert(organisationHealthSnapshot)
      .values({
        id: randomUUID(),
        organisationId,
        computedAt: now,
        visitVolumeTrend: visitVolumeTrend.toFixed(3),
        adminLoginRecencyDays,
        notificationFailureRate: notificationFailureRate?.toFixed(4),
        deviceOfflineRate: deviceOfflineRate?.toFixed(4),
        healthScore: healthScore.toFixed(2),
        churnRiskBandCode,
      })
      .returning();

    return row;
  }

  /**
   * Weighted scorecard, 0-100. The weights are ops-tunable config
   * (platform_configuration_setting 'organisation_health_score_weights',
   * migration 0029) rather than constants here, because the honest answer to
   * "why these numbers" is still "first-pass judgment" — the people watching
   * the queue every week are the ones who should be able to adjust them, with
   * a before/after audit row for each change.
   */
  private scoreFrom(
    signals: {
      visitVolumeTrend: number;
      adminLoginRecencyDays: number | null;
      notificationFailureRate: number | null;
      deviceOfflineRate: number | null;
    },
    weights: HealthScoreWeights,
  ): number {
    let score = weights.baseScore;
    // Declining check-in volume is the strongest signal — a customer whose
    // volume is dropping is disengaging from the product itself.
    score += Math.max(
      weights.visitVolumeTrendFloor,
      Math.min(weights.visitVolumeTrendCeiling, signals.visitVolumeTrend * weights.visitVolumeTrendWeight),
    );
    if (signals.adminLoginRecencyDays !== null) {
      score -= Math.min(
        weights.adminLoginRecencyCap,
        signals.adminLoginRecencyDays * weights.adminLoginRecencyPerDay,
      );
    }
    if (signals.notificationFailureRate !== null) {
      score -= signals.notificationFailureRate * weights.notificationFailureWeight;
    }
    if (signals.deviceOfflineRate !== null) {
      score -= signals.deviceOfflineRate * weights.deviceOfflineWeight;
    }
    return Math.max(0, Math.min(100, score));
  }

  private async countVisits(organisationId: string, from: Date, to: Date): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(visitorVisits)
      .where(
        and(
          eq(visitorVisits.organisationId, organisationId),
          gte(visitorVisits.checkedInAt, from),
          sql`${visitorVisits.checkedInAt} < ${to}`,
        ),
      );
    return row?.value ?? 0;
  }

  private async notificationFailureRate(organisationId: string, since: Date): Promise<number | null> {
    const failedStatus = await this.typeDefs.id("notification_delivery_status", "failed").catch(() => null);
    const rows = await this.db.query.notificationDeliveryInstructions.findMany({
      where: and(
        eq(notificationDeliveryInstructions.organisationId, organisationId),
        gte(notificationDeliveryInstructions.nextAttemptAt, since),
      ),
    });
    if (rows.length === 0) return null;
    const failed = failedStatus ? rows.filter((r) => r.statusCode === failedStatus).length : 0;
    return failed / rows.length;
  }

  /** No denormalized "current status" column on managedKioskDevices — derives it from each device's latest status-log row. */
  private async deviceOfflineRate(organisationId: string): Promise<number | null> {
    const devices = await this.db.query.managedKioskDevices.findMany({
      where: and(eq(managedKioskDevices.organisationId, organisationId), isNull(managedKioskDevices.deletedAt)),
    });
    if (devices.length === 0) return null;

    const offlineStatus = await this.typeDefs.id("device_operational_status", "offline").catch(() => null);
    if (!offlineStatus) return null;

    const logs = await this.db.query.deviceOperationalStatusLog.findMany({
      where: inArray(
        deviceOperationalStatusLog.deviceId,
        devices.map((d) => d.id),
      ),
      orderBy: desc(deviceOperationalStatusLog.occurredAt),
    });
    const latestByDevice = new Map<string, string>();
    for (const log of logs) {
      if (!latestByDevice.has(log.deviceId)) latestByDevice.set(log.deviceId, log.statusCode);
    }
    const offline = [...latestByDevice.values()].filter((status) => status === offlineStatus).length;
    return offline / devices.length;
  }

  /** Full snapshot history for one org, oldest first — the health-score trend chart's data source. */
  async listSnapshotHistory(organisationId: string) {
    return this.db.query.organisationHealthSnapshot.findMany({
      where: eq(organisationHealthSnapshot.organisationId, organisationId),
      orderBy: organisationHealthSnapshot.computedAt,
    });
  }

  /** Expected-Value ranking (DSFB Ch. 11): risk x account value (MRR), not risk alone. */
  async churnQueue() {
    const latestPerOrg = await this.db
      .select()
      .from(organisationHealthSnapshot)
      .orderBy(desc(organisationHealthSnapshot.computedAt));
    const seen = new Set<string>();
    const rows: typeof latestPerOrg = [];
    for (const row of latestPerOrg) {
      if (seen.has(row.organisationId)) continue;
      seen.add(row.organisationId);
      rows.push(row);
    }

    const subs = await this.db.query.organisationSubscription.findMany({ where: isNull(organisationSubscription.deletedAt) });
    const mrrByOrg = new Map(subs.map((s) => [s.organisationId, Number(s.mrrAmount)]));

    return rows
      .map((row) => {
        const mrr = mrrByOrg.get(row.organisationId) ?? 0;
        const risk = (100 - Number(row.healthScore)) / 100;
        return { ...row, mrr, expectedValue: risk * mrr };
      })
      .sort((a, b) => b.expectedValue - a.expectedValue);
  }
}
