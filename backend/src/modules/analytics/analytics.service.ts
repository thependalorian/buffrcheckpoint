import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNull, type SQL, sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { auditEvents, visitorVisits } from "../../db/schema";
import { addDays, dateRange, localDateIn } from "../analytics-etl/local-date";
import { type DailyCount, type ForecastResult, forecastDaily } from "./forecast";

export interface VisitActivityPoint {
  date: string; // yyyy-MM-dd
  checkIns: number;
  complianceEvents: number;
}

export type MixDimension = "channel" | "visitor_type" | "purpose";

export interface AnalyticsScope {
  organisationId: string;
  siteId: string | null;
}

export interface Metric {
  value: number | null;
  previous: number | null;
  changePct: number | null;
}

function metric(value: number | null, previous: number | null): Metric {
  const changePct =
    value !== null && previous !== null && previous !== 0
      ? Math.round(((value - previous) / previous) * 1000) / 10
      : null;
  return { value, previous, changePct };
}

function share(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

const MIX_COLUMN: Record<MixDimension, SQL> = {
  channel: sql.raw("f.arrival_channel_code"),
  visitor_type: sql.raw("f.visitor_type_code"),
  purpose: sql.raw("f.purpose_category_code"),
};

// Property-side reporting. Every read except visitActivity comes from the
// PII-free rollups (visit_daily_fact / visit_hourly_fact) written by
// AnalyticsEtlService — counts only, never a visitor row. Site-scoped users
// (user.siteId set) are always pinned to their own site.
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  private get timezone(): string {
    return process.env.ANALYTICS_TIMEZONE ?? "Africa/Windhoek";
  }

  scopeFor(user: AuthenticatedUser, requestedSiteId: string | undefined): AnalyticsScope {
    return { organisationId: user.organisationId, siteId: user.siteId ?? requestedSiteId ?? null };
  }

  /** Default reporting window: the last `days` local days ending today. */
  defaultRange(days = 30): { from: string; to: string } {
    const to = localDateIn(new Date(), this.timezone);
    return { from: addDays(to, -(days - 1)), to };
  }

  private siteFilter(scope: AnalyticsScope): SQL {
    return scope.siteId ? sql`AND f.site_id = ${scope.siteId}` : sql``;
  }

  // Backs the dashboard-home "Visit Activity" chart. Reads raw rows (not the
  // rollup) so the home page is live between ETL runs; days are bucketed in
  // local time so a 01:00 check-in counts on the Windhoek day it happened.
  async visitActivity(days: number, user: AuthenticatedUser): Promise<VisitActivityPoint[]> {
    const { from, to } = this.defaultRange(days);
    const since = new Date(`${addDays(from, -1)}T00:00:00Z`);

    const [visits, events] = await Promise.all([
      this.db.query.visitorVisits.findMany({
        where: and(
          eq(visitorVisits.organisationId, user.organisationId),
          gte(visitorVisits.checkedInAt, since),
          isNull(visitorVisits.deletedAt),
        ),
        columns: { checkedInAt: true },
      }),
      this.db.query.auditEvents.findMany({
        where: and(eq(auditEvents.organisationId, user.organisationId), gte(auditEvents.occurredAt, since)),
        columns: { occurredAt: true },
      }),
    ]);

    const checkInsByDay = new Map<string, number>();
    for (const v of visits) {
      const key = localDateIn(v.checkedInAt, this.timezone);
      checkInsByDay.set(key, (checkInsByDay.get(key) ?? 0) + 1);
    }
    const eventsByDay = new Map<string, number>();
    for (const e of events) {
      const key = localDateIn(e.occurredAt, this.timezone);
      eventsByDay.set(key, (eventsByDay.get(key) ?? 0) + 1);
    }

    return dateRange(from, to).map((date) => ({
      date,
      checkIns: checkInsByDay.get(date) ?? 0,
      complianceEvents: eventsByDay.get(date) ?? 0,
    }));
  }

  private async periodTotals(scope: AnalyticsScope, from: string, to: string) {
    const result = await this.db.execute(sql`
      SELECT
        COALESCE(sum(f.check_in_count), 0)::int AS check_ins,
        COALESCE(sum(f.offline_captured_count), 0)::int AS offline,
        COALESCE(sum(f.dwell_minutes_total), 0)::float AS dwell_total,
        COALESCE(sum(f.dwell_sample_count), 0)::int AS dwell_samples,
        COALESCE(sum(f.check_in_count) FILTER (WHERE ch.code = 'qr'), 0)::int AS own_phone,
        COALESCE(sum(f.check_in_count) FILTER (WHERE ch.code = 'assisted'), 0)::int AS assisted
      FROM visit_daily_fact f
      JOIN type_definition ch ON ch.id = f.arrival_channel_code
      WHERE f.organisation_id = ${scope.organisationId}
        AND f.local_date BETWEEN ${from}::date AND ${to}::date
        ${this.siteFilter(scope)}
    `);
    const row = result.rows[0] as {
      check_ins: number;
      offline: number;
      dwell_total: number;
      dwell_samples: number;
      own_phone: number;
      assisted: number;
    };
    return {
      checkIns: Number(row.check_ins),
      offline: Number(row.offline),
      avgMinutes:
        Number(row.dwell_samples) > 0 ? Math.round(Number(row.dwell_total) / Number(row.dwell_samples)) : null,
      ownPhoneShare: share(Number(row.own_phone), Number(row.check_ins)),
      assistedShare: share(Number(row.assisted), Number(row.check_ins)),
    };
  }

  async lastRefreshedAt(scope: AnalyticsScope): Promise<string | null> {
    const result = await this.db.execute(sql`
      SELECT max(f.computed_at) AS refreshed FROM visit_daily_fact f
      WHERE f.organisation_id = ${scope.organisationId} ${this.siteFilter(scope)}
    `);
    const value = (result.rows[0] as { refreshed: string | Date | null } | undefined)?.refreshed ?? null;
    return value ? new Date(value).toISOString() : null;
  }

  async summary(scope: AnalyticsScope, from: string, to: string) {
    const days = dateRange(from, to).length;
    const previousTo = addDays(from, -1);
    const previousFrom = addDays(previousTo, -(days - 1));
    const [current, previous, refreshedAt] = await Promise.all([
      this.periodTotals(scope, from, to),
      this.periodTotals(scope, previousFrom, previousTo),
      this.lastRefreshedAt(scope),
    ]);
    const hadPrevious = previous.checkIns > 0;
    return {
      period: { from, to },
      previousPeriod: { from: previousFrom, to: previousTo },
      refreshedAt,
      checkIns: metric(current.checkIns, hadPrevious ? previous.checkIns : null),
      avgMinutesOnSite: metric(current.avgMinutes, previous.avgMinutes),
      ownPhoneShare: metric(current.ownPhoneShare, previous.ownPhoneShare),
      assistedShare: metric(current.assistedShare, previous.assistedShare),
      offlineCaptures: metric(current.offline, hadPrevious ? previous.offline : null),
    };
  }

  async daily(scope: AnalyticsScope, from: string, to: string): Promise<DailyCount[]> {
    const result = await this.db.execute(sql`
      SELECT f.local_date::text AS date, sum(f.check_in_count)::int AS count
      FROM visit_daily_fact f
      WHERE f.organisation_id = ${scope.organisationId}
        AND f.local_date BETWEEN ${from}::date AND ${to}::date
        ${this.siteFilter(scope)}
      GROUP BY f.local_date
    `);
    const byDate = new Map((result.rows as { date: string; count: number }[]).map((r) => [r.date, Number(r.count)]));
    return dateRange(from, to).map((date) => ({ date, count: byDate.get(date) ?? 0 }));
  }

  /** 7 x 24 matrix of check-ins, weekday 0 = Monday. Also returns how many of each weekday the range covers. */
  async busyHours(scope: AnalyticsScope, from: string, to: string) {
    const result = await this.db.execute(sql`
      SELECT (EXTRACT(ISODOW FROM f.local_date)::int - 1) AS weekday, f.local_hour AS hour, sum(f.check_in_count)::int AS count
      FROM visit_hourly_fact f
      WHERE f.organisation_id = ${scope.organisationId}
        AND f.local_date BETWEEN ${from}::date AND ${to}::date
        ${this.siteFilter(scope)}
      GROUP BY 1, 2
    `);
    const matrix: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
    let total = 0;
    for (const row of result.rows as { weekday: number; hour: number; count: number }[]) {
      matrix[Number(row.weekday)][Number(row.hour)] = Number(row.count);
      total += Number(row.count);
    }
    return { from, to, total, matrix };
  }

  async mix(scope: AnalyticsScope, dimension: MixDimension, from: string, to: string) {
    const column = MIX_COLUMN[dimension];
    const result = await this.db.execute(sql`
      SELECT td.code AS code, COALESCE(td.label, 'Not recorded') AS label, sum(f.check_in_count)::int AS count
      FROM visit_daily_fact f
      LEFT JOIN type_definition td ON td.id = ${column}
      WHERE f.organisation_id = ${scope.organisationId}
        AND f.local_date BETWEEN ${from}::date AND ${to}::date
        ${this.siteFilter(scope)}
      GROUP BY td.code, td.label
      HAVING sum(f.check_in_count) > 0
      ORDER BY 3 DESC
    `);
    const rows = (result.rows as { code: string | null; label: string; count: number }[]).map((r) => ({
      code: r.code,
      label: r.label,
      count: Number(r.count),
    }));
    const total = rows.reduce((a, r) => a + r.count, 0);
    return { dimension, from, to, total, rows: rows.map((r) => ({ ...r, share: share(r.count, total) })) };
  }

  /**
   * History runs from this scope's first recorded day (never zero-filled
   * before it — absence is not zero) up to yesterday, since today is partial.
   */
  async forecast(scope: AnalyticsScope, horizon: number): Promise<ForecastResult & { history: DailyCount[] }> {
    const yesterday = addDays(localDateIn(new Date(), this.timezone), -1);
    const firstResult = await this.db.execute(sql`
      SELECT min(f.local_date)::text AS first FROM visit_daily_fact f
      WHERE f.organisation_id = ${scope.organisationId} AND f.check_in_count > 0 ${this.siteFilter(scope)}
    `);
    const first = (firstResult.rows[0] as { first: string | null } | undefined)?.first ?? null;
    if (!first || first > yesterday) {
      return { ...forecastDaily([], horizon), history: [] };
    }
    const earliest = addDays(yesterday, -119);
    const history = await this.daily(scope, first > earliest ? first : earliest, yesterday);
    return { ...forecastDaily(history, horizon), history: history.slice(-56) };
  }

  /** Aggregated daily facts as CSV for auditors and head offices. Counts only. */
  async exportCsv(scope: AnalyticsScope, from: string, to: string): Promise<string> {
    const result = await this.db.execute(sql`
      SELECT f.local_date::text AS date, s.name AS site, vt.label AS visitor_type, ch.label AS channel,
             COALESCE(pc.label, 'Not recorded') AS purpose,
             sum(f.check_in_count)::int AS check_ins, sum(f.check_out_count)::int AS check_outs,
             sum(f.offline_captured_count)::int AS offline_captures
      FROM visit_daily_fact f
      JOIN sites s ON s.id = f.site_id
      JOIN type_definition vt ON vt.id = f.visitor_type_code
      JOIN type_definition ch ON ch.id = f.arrival_channel_code
      LEFT JOIN type_definition pc ON pc.id = f.purpose_category_code
      WHERE f.organisation_id = ${scope.organisationId}
        AND f.local_date BETWEEN ${from}::date AND ${to}::date
        ${this.siteFilter(scope)}
      GROUP BY 1, 2, 3, 4, 5
      HAVING sum(f.check_in_count) > 0
      ORDER BY 1, 2, 3, 4, 5
    `);
    const header = [
      "date",
      "site",
      "visitor_type",
      "channel",
      "purpose",
      "check_ins",
      "check_outs",
      "offline_captures",
    ];
    const csvCell = (value: unknown) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = (result.rows as Record<string, unknown>[]).map((row) =>
      header.map((key) => csvCell(row[key])).join(","),
    );
    return [header.join(","), ...lines].join("\n");
  }
}
