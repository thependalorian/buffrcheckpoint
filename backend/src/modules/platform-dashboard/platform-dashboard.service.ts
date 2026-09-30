import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  deviceOperationalStatusLog,
  invoice,
  managedKioskDevices,
  notificationDeliveryInstructions,
  organisationHealthSnapshot,
  organisationKybStatusEvents,
  organisationSubscription,
  organisations,
  platformIncident,
  sites,
  supportTicket,
  supportTicketStatusEvents,
  typeDefinition,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

/** Month buckets from `from` through the current month, inclusive. */
function monthSeries(from: Date): { label: string; endsBefore: Date }[] {
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth(), 1);
  const months: { label: string; endsBefore: Date }[] = [];
  while (cursor <= last && months.length < 60) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    months.push({
      label: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      endsBefore: next,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/** ISO date of the Monday starting the week containing `date` — matches Postgres date_trunc('week', ...). */
function startOfWeekIso(date: Date): string {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOffset = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - dayOffset);
  return copy.toISOString().slice(0, 10);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

// Cross-tenant AGGREGATE reads only — no per-visitor PII, so this reads
// across every organisation without a break-glass grant (RbacGuard's
// platform_support branch only fires when user.supportSessionId is set —
// see rbac.guard.ts). This is the "routine, no customer data" tier.
@Injectable()
export class PlatformDashboardService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async overview() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [orgCount, siteCount, mtdVisits, activeDevices, openIncidents, highRiskOrgs] = await Promise.all([
      this.db.select({ value: count() }).from(organisations).where(isNull(organisations.deletedAt)),
      this.db.select({ value: count() }).from(sites).where(isNull(sites.deletedAt)),
      this.db.select({ value: count() }).from(visitorVisits).where(gte(visitorVisits.checkedInAt, monthStart)),
      this.db.select({ value: count() }).from(managedKioskDevices).where(isNull(managedKioskDevices.deletedAt)),
      this.openIncidentCount(),
      this.highChurnRiskOrgCount(),
    ]);

    return {
      organisationCount: orgCount[0]?.value ?? 0,
      siteCount: siteCount[0]?.value ?? 0,
      mtdVisitVolume: mtdVisits[0]?.value ?? 0,
      activeDeviceCount: activeDevices[0]?.value ?? 0,
      openIncidentCount: openIncidents,
      highChurnRiskOrgCount: highRiskOrgs,
    };
  }

  private async openIncidentCount(): Promise<number> {
    const resolvedStatus = await this.typeDefs.id("incident_status", "resolved");
    const [row] = await this.db
      .select({ value: count() })
      .from(platformIncident)
      .where(and(isNull(platformIncident.deletedAt), sql`${platformIncident.statusCode} != ${resolvedStatus}`));
    return row?.value ?? 0;
  }

  private async highChurnRiskOrgCount(): Promise<number> {
    const highBand = await this.typeDefs.id("churn_risk_band", "high");
    // Most recent snapshot per org, filtered to 'high' — approximated with a
    // simple correlated-subquery-free version: count distinct orgs whose
    // latest snapshot (by computed_at) is 'high'. Good enough at this scale;
    // revisit with a window function if the org count grows large.
    const latest = await this.db
      .select({
        organisationId: organisationHealthSnapshot.organisationId,
        band: organisationHealthSnapshot.churnRiskBandCode,
      })
      .from(organisationHealthSnapshot)
      .orderBy(desc(organisationHealthSnapshot.computedAt));
    const seen = new Set<string>();
    let highCount = 0;
    for (const row of latest) {
      if (seen.has(row.organisationId)) continue;
      seen.add(row.organisationId);
      if (row.band === highBand) highCount++;
    }
    return highCount;
  }

  async recentActivity() {
    const [incidents, tickets] = await Promise.all([
      this.db.query.platformIncident.findMany({
        where: isNull(platformIncident.deletedAt),
        orderBy: desc(platformIncident.openedAt),
        limit: 10,
      }),
      this.db.query.supportTicket.findMany({
        where: isNull(supportTicket.deletedAt),
        orderBy: desc(supportTicket.createdAt),
        limit: 10,
      }),
    ]);
    return { incidents, tickets };
  }

  /** Org directory — aggregate rollup only (name, lifecycle stage, latest health/churn band, MRR), no visitor PII. */
  async listOrganisations() {
    const orgs = await this.db.query.organisations.findMany({ where: isNull(organisations.deletedAt) });
    const [snapshots, subs, stageDefs, bandDefs] = await Promise.all([
      this.db.select().from(organisationHealthSnapshot).orderBy(desc(organisationHealthSnapshot.computedAt)),
      this.db.query.organisationSubscription.findMany({ where: isNull(organisationSubscription.deletedAt) }),
      this.db.query.typeDefinition.findMany({ where: eq(typeDefinition.domain, "crm_lifecycle_stage") }),
      this.db.query.typeDefinition.findMany({ where: eq(typeDefinition.domain, "churn_risk_band") }),
    ]);

    const latestSnapshotByOrg = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots)
      if (!latestSnapshotByOrg.has(s.organisationId)) latestSnapshotByOrg.set(s.organisationId, s);
    const mrrByOrg = new Map(subs.map((s) => [s.organisationId, Number(s.mrrAmount)]));
    const stageLabel = new Map(stageDefs.map((d) => [d.id, d.label]));
    const bandLabel = new Map(bandDefs.map((d) => [d.id, d.code]));

    return orgs.map((org) => {
      const snapshot = latestSnapshotByOrg.get(org.id);
      return {
        id: org.id,
        legalName: org.legalName,
        tradingName: org.tradingName,
        lifecycleStage: org.lifecycleStageCode ? (stageLabel.get(org.lifecycleStageCode) ?? null) : null,
        healthScore: snapshot ? Number(snapshot.healthScore) : null,
        churnRiskBand: snapshot ? (bandLabel.get(snapshot.churnRiskBandCode) ?? null) : null,
        mrr: mrrByOrg.get(org.id) ?? 0,
      };
    });
  }

  /** Weekly incident-open volume — Overview's incident TrendChart, chart→queue drill-down into /incidents. */
  async incidentVolumeTrend() {
    const rows = await this.db
      .select({ week: sql<string>`date_trunc('week', ${platformIncident.openedAt})`.as("week"), value: count() })
      .from(platformIncident)
      .where(isNull(platformIncident.deletedAt))
      .groupBy(sql`date_trunc('week', ${platformIncident.openedAt})`)
      .orderBy(sql`date_trunc('week', ${platformIncident.openedAt})`);
    return rows.map((r) => ({ period: r.week, count: r.value }));
  }

  /** Weekly ticket-created volume — Overview's ticket TrendChart, chart→queue drill-down into /tickets. */
  async ticketVolumeTrend() {
    const rows = await this.db
      .select({ week: sql<string>`date_trunc('week', ${supportTicket.createdAt})`.as("week"), value: count() })
      .from(supportTicket)
      .where(isNull(supportTicket.deletedAt))
      .groupBy(sql`date_trunc('week', ${supportTicket.createdAt})`)
      .orderBy(sql`date_trunc('week', ${supportTicket.createdAt})`);
    return rows.map((r) => ({ period: r.week, count: r.value }));
  }

  /** Latest health score x MRR per org — the Analytics page's RFM-style account-segmentation scatter. */
  async accountSegmentation() {
    const [snapshots, subs, orgs] = await Promise.all([
      this.db.select().from(organisationHealthSnapshot).orderBy(desc(organisationHealthSnapshot.computedAt)),
      this.db.query.organisationSubscription.findMany({ where: isNull(organisationSubscription.deletedAt) }),
      this.db.query.organisations.findMany({ where: isNull(organisations.deletedAt) }),
    ]);

    const latestByOrg = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) if (!latestByOrg.has(s.organisationId)) latestByOrg.set(s.organisationId, s);
    const mrrByOrg = new Map(subs.map((s) => [s.organisationId, Number(s.mrrAmount)]));
    const nameByOrg = new Map(orgs.map((o) => [o.id, o.tradingName ?? o.legalName]));

    return [...latestByOrg.values()].map((s) => ({
      organisationId: s.organisationId,
      organisationName: nameByOrg.get(s.organisationId) ?? s.organisationId,
      healthScore: Number(s.healthScore),
      mrr: mrrByOrg.get(s.organisationId) ?? 0,
    }));
  }

  /**
   * Retention proxy by week-since-first-observed. `organisations` has no
   * signup-date column (core schema — not this pass's to add), so the
   * cohort start is each org's first health snapshot instead of a true
   * signup date. Labeled as such on the chart — an honest proxy, not an
   * invented signup metric. "Healthy" reuses the score>=40 cutoff
   * organisation-health.service.ts's own scorecard already uses.
   */
  async retentionCurve() {
    const snapshots = await this.db
      .select()
      .from(organisationHealthSnapshot)
      .orderBy(organisationHealthSnapshot.computedAt);

    const firstByOrg = new Map<string, Date>();
    for (const s of snapshots) {
      if (!firstByOrg.has(s.organisationId)) firstByOrg.set(s.organisationId, s.computedAt);
    }
    const totalOrgs = firstByOrg.size;
    if (totalOrgs === 0) return [];

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const healthyByWeek = new Map<number, Set<string>>();
    for (const s of snapshots) {
      const first = firstByOrg.get(s.organisationId);
      if (!first) continue;
      const week = Math.floor((s.computedAt.getTime() - first.getTime()) / WEEK_MS);
      if (Number(s.healthScore) >= 40) {
        if (!healthyByWeek.has(week)) healthyByWeek.set(week, new Set());
        healthyByWeek.get(week)?.add(s.organisationId);
      }
    }

    return [...healthyByWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, orgs]) => ({ week, retentionRate: orgs.size / totalOrgs, orgCount: totalOrgs }));
  }

  /**
   * Monthly recurring revenue on the books at each month end, from
   * organisation_subscription. Approximation, and worth naming as one:
   * subscription rows carry `startedAt` and a current `mrrAmount`, not a
   * priced history, so a plan change is retroactively applied to earlier
   * months. Good enough to answer "is MRR growing"; not a billing report —
   * invoicedRevenueTrend() below is the one backed by issued invoices.
   */
  async billingMrrTrend() {
    const subs = await this.db.query.organisationSubscription.findMany({
      where: isNull(organisationSubscription.deletedAt),
    });
    if (subs.length === 0) return [];

    const cancelledStatus = await this.typeDefs.id("subscription_status", "cancelled").catch(() => null);
    const monthStarts = monthSeries(
      subs.reduce<Date>((earliest, s) => (s.startedAt < earliest ? s.startedAt : earliest), subs[0].startedAt),
    );

    return monthStarts.map(({ label, endsBefore }) => {
      const mrr = subs
        .filter((s) => s.startedAt < endsBefore && !(cancelledStatus && s.statusCode === cancelledStatus))
        .reduce((sum, s) => sum + Number(s.mrrAmount), 0);
      return { period: label, count: Math.round(mrr) };
    });
  }

  /** Invoiced (not collected) amount by month — the money actually billed, from the invoice table. */
  async invoicedRevenueTrend() {
    const voidStatus = await this.typeDefs.id("invoice_status", "void").catch(() => null);
    const rows = await this.db
      .select({
        month: sql<string>`date_trunc('month', ${invoice.issuedAt})`.as("month"),
        total: sql<string>`coalesce(sum(${invoice.amount}), 0)`.as("total"),
      })
      .from(invoice)
      .where(
        voidStatus
          ? and(isNull(invoice.deletedAt), sql`${invoice.statusCode} != ${voidStatus}`)
          : isNull(invoice.deletedAt),
      )
      .groupBy(sql`date_trunc('month', ${invoice.issuedAt})`)
      .orderBy(sql`date_trunc('month', ${invoice.issuedAt})`);
    return rows.map((r) => ({ period: r.month, count: Math.round(Number(r.total)) }));
  }

  /** Weekly count of KYB submissions that reached a decision — review throughput, not backlog. */
  async kybThroughputTrend() {
    const [verified, rejected] = await Promise.all([
      this.typeDefs.id("kyb_status", "verified").catch(() => null),
      this.typeDefs.id("kyb_status", "rejected").catch(() => null),
    ]);
    const decided = [verified, rejected].filter((id): id is string => Boolean(id));
    if (decided.length === 0) return [];

    const rows = await this.db
      .select({
        week: sql<string>`date_trunc('week', ${organisationKybStatusEvents.occurredAt})`.as("week"),
        value: count(),
      })
      .from(organisationKybStatusEvents)
      .where(inArray(organisationKybStatusEvents.toStatusCode, decided))
      .groupBy(sql`date_trunc('week', ${organisationKybStatusEvents.occurredAt})`)
      .orderBy(sql`date_trunc('week', ${organisationKybStatusEvents.occurredAt})`);
    return rows.map((r) => ({ period: r.week, count: r.value }));
  }

  /** Device register split by CRAN compliance status — the concentration question, so ranked bars, not a trend. */
  async deviceComplianceShares() {
    const rows = await this.db
      .select({ statusCode: typeDefinition.code, statusLabel: typeDefinition.label, value: count() })
      .from(managedKioskDevices)
      .leftJoin(typeDefinition, eq(managedKioskDevices.cranComplianceStatusCode, typeDefinition.id))
      .where(isNull(managedKioskDevices.deletedAt))
      .groupBy(typeDefinition.code, typeDefinition.label);
    return rows.map((r) => ({
      statusCode: r.statusCode ?? "unassessed",
      label: r.statusLabel ?? "Unassessed",
      count: r.value,
    }));
  }

  /**
   * Weekly notification delivery health. Buckets on nextAttemptAt (the row's
   * enqueue-or-retry clock) because a never-sent row has no sentAt to bucket
   * on — the same field notificationFailureRate() in the health scorecard
   * already uses, so the two never disagree.
   */
  async notificationDeliveryTrend() {
    const [sentStatus, failedStatus] = await Promise.all([
      this.typeDefs.id("notification_delivery_status", "sent").catch(() => null),
      this.typeDefs.id("notification_delivery_status", "failed").catch(() => null),
    ]);

    const rows = await this.db
      .select({
        week: sql<string>`date_trunc('week', ${notificationDeliveryInstructions.nextAttemptAt})`.as("week"),
        statusCode: notificationDeliveryInstructions.statusCode,
        value: count(),
      })
      .from(notificationDeliveryInstructions)
      .where(isNull(notificationDeliveryInstructions.deletedAt))
      .groupBy(
        sql`date_trunc('week', ${notificationDeliveryInstructions.nextAttemptAt})`,
        notificationDeliveryInstructions.statusCode,
      )
      .orderBy(sql`date_trunc('week', ${notificationDeliveryInstructions.nextAttemptAt})`);

    const byWeek = new Map<string, { total: number; sent: number; failed: number }>();
    for (const row of rows) {
      const bucket = byWeek.get(row.week) ?? { total: 0, sent: 0, failed: 0 };
      bucket.total += row.value;
      if (sentStatus && row.statusCode === sentStatus) bucket.sent += row.value;
      if (failedStatus && row.statusCode === failedStatus) bucket.failed += row.value;
      byWeek.set(row.week, bucket);
    }

    return [...byWeek.entries()].map(([period, bucket]) => ({
      period,
      total: bucket.total,
      sent: bucket.sent,
      failed: bucket.failed,
      successRate: bucket.total === 0 ? 0 : bucket.sent / bucket.total,
    }));
  }

  /** Weekly platform-wide check-in volume — the product's own usage curve. */
  // Reads the ETL rollup so this chart, the admin analytics page and the
  // arrival statistics all count from the same visit_daily_fact rows.
  async visitVolumeTrend() {
    const result = await this.db.execute(sql`
      SELECT date_trunc('week', local_date)::date::text AS week, sum(check_in_count)::int AS value
      FROM visit_daily_fact
      GROUP BY 1
      HAVING sum(check_in_count) > 0
      ORDER BY 1
    `);
    return (result.rows as { week: string; value: number }[]).map((r) => ({ period: r.week, count: Number(r.value) }));
  }

  /**
   * Median hours from ticket creation to its first 'resolved' transition,
   * bucketed by the week it was resolved. Median rather than mean because one
   * ticket forgotten for three weeks otherwise redefines the whole week.
   */
  async ticketResolutionTimeTrend() {
    const resolvedStatus = await this.typeDefs.id("ticket_status", "resolved").catch(() => null);
    if (!resolvedStatus) return [];

    const [tickets, events] = await Promise.all([
      this.db.query.supportTicket.findMany({ where: isNull(supportTicket.deletedAt) }),
      this.db.query.supportTicketStatusEvents.findMany({
        where: eq(supportTicketStatusEvents.toStatusCode, resolvedStatus),
        orderBy: supportTicketStatusEvents.occurredAt,
      }),
    ]);
    const createdAtByTicket = new Map(tickets.map((t) => [t.id, t.createdAt]));

    const hoursByWeek = new Map<string, number[]>();
    const seen = new Set<string>();
    for (const event of events) {
      if (seen.has(event.ticketId)) continue; // first resolution only
      seen.add(event.ticketId);
      const createdAt = createdAtByTicket.get(event.ticketId);
      if (!createdAt) continue;
      const hours = (event.occurredAt.getTime() - createdAt.getTime()) / (60 * 60 * 1000);
      if (hours < 0) continue;
      const week = startOfWeekIso(event.occurredAt);
      const bucket = hoursByWeek.get(week) ?? [];
      bucket.push(hours);
      hoursByWeek.set(week, bucket);
    }

    return [...hoursByWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, hours]) => ({
        period,
        count: Math.round(median(hours) * 10) / 10,
        resolvedCount: hours.length,
      }));
  }

  /**
   * Per-organisation offline/backlog picture for the Devices KPI and the
   * admin banner. The kiosk's own outbox is on-device (Room, encrypted) and
   * never reaches the backend, so "backlog" here is what the server can
   * actually see: devices whose latest operational status is offline, plus
   * notification rows still queued for that org.
   */
  async deviceBacklogSummary() {
    const [offlineStatus, pendingStatus] = await Promise.all([
      this.typeDefs.id("device_operational_status", "offline").catch(() => null),
      this.typeDefs.id("notification_delivery_status", "pending").catch(() => null),
    ]);

    const devices = await this.db.query.managedKioskDevices.findMany({
      where: isNull(managedKioskDevices.deletedAt),
    });
    const logs = devices.length
      ? await this.db.query.deviceOperationalStatusLog.findMany({
          where: inArray(
            deviceOperationalStatusLog.deviceId,
            devices.map((d) => d.id),
          ),
          orderBy: desc(deviceOperationalStatusLog.occurredAt),
        })
      : [];
    const latestStatusByDevice = new Map<string, string>();
    for (const log of logs) {
      if (!latestStatusByDevice.has(log.deviceId)) latestStatusByDevice.set(log.deviceId, log.statusCode);
    }

    const pendingNotifications = pendingStatus
      ? await this.db
          .select({ organisationId: notificationDeliveryInstructions.organisationId, value: count() })
          .from(notificationDeliveryInstructions)
          .where(
            and(
              eq(notificationDeliveryInstructions.statusCode, pendingStatus),
              isNull(notificationDeliveryInstructions.deletedAt),
            ),
          )
          .groupBy(notificationDeliveryInstructions.organisationId)
      : [];
    const pendingByOrg = new Map(pendingNotifications.map((r) => [r.organisationId, r.value]));

    const byOrg = new Map<
      string,
      { deviceCount: number; offlineDeviceCount: number; pendingNotificationCount: number }
    >();
    for (const device of devices) {
      const bucket = byOrg.get(device.organisationId) ?? {
        deviceCount: 0,
        offlineDeviceCount: 0,
        pendingNotificationCount: pendingByOrg.get(device.organisationId) ?? 0,
      };
      bucket.deviceCount++;
      if (offlineStatus && latestStatusByDevice.get(device.id) === offlineStatus) bucket.offlineDeviceCount++;
      byOrg.set(device.organisationId, bucket);
    }
    for (const [organisationId, value] of pendingByOrg) {
      if (byOrg.has(organisationId)) continue;
      byOrg.set(organisationId, { deviceCount: 0, offlineDeviceCount: 0, pendingNotificationCount: value });
    }

    const orgRows = [...byOrg.entries()].map(([organisationId, bucket]) => ({ organisationId, ...bucket }));
    return {
      deviceCount: devices.length,
      offlineDeviceCount: orgRows.reduce((sum, o) => sum + o.offlineDeviceCount, 0),
      pendingNotificationCount: orgRows.reduce((sum, o) => sum + o.pendingNotificationCount, 0),
      organisations: orgRows.sort(
        (a, b) =>
          b.offlineDeviceCount - a.offlineDeviceCount || b.pendingNotificationCount - a.pendingNotificationCount,
      ),
    };
  }

  /** Per-region site density + latest average health score, for the Namibia choropleth. */
  async regionalBreakdown() {
    const regionRows = await this.db.query.typeDefinition.findMany({
      where: eq(typeDefinition.domain, "namibia_region"),
    });

    const siteCounts = await this.db
      .select({ regionCode: sites.namibiaRegionCode, value: count() })
      .from(sites)
      .where(isNull(sites.deletedAt))
      .groupBy(sites.namibiaRegionCode);

    const siteCountByRegion = new Map(siteCounts.map((r) => [r.regionCode, r.value]));

    return regionRows.map((region) => ({
      regionCode: region.code,
      siteCount: siteCountByRegion.get(region.id) ?? 0,
    }));
  }
}
