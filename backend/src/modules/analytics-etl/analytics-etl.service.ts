import { Inject, Injectable, Logger } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { analyticsEtlRun, analyticsEtlRunStatusLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { minCellThreshold, suppress } from "../analytics/suppression";
import { addDays, localDateIn } from "./local-date";
import { randomUUID } from "node:crypto";

export type EtlRunKind = "incremental" | "backfill";

export interface EtlRunResult {
  id: string;
  status: "succeeded" | "failed";
  windowFrom: string;
  windowTo: string;
  rowsWritten: number;
  sourceVisitCount: number;
  factVisitCount: number;
  errorMessage: string | null;
}

// Rolls visitor_visits up into visit_daily_fact / visit_hourly_fact
// (db/migrations/0041). Every run: open a run row + status log entry,
// recompute each local date in the window in ONE neon-http batch (a single
// transaction), then reconcile raw visit count against sum(check_in_count)
// for the same window. A non-zero difference fails the run with both numbers
// in error_message — the rollup is never trusted silently.
//
// Local dates use each site's own `sites.timezone`, so a 01:00 check-in in
// Windhoek counts on that Windhoek day, not the previous UTC day.
@Injectable()
export class AnalyticsEtlService {
  private readonly logger = new Logger(AnalyticsEtlService.name);
  private running = false;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  private get windowTimezone(): string {
    return process.env.ANALYTICS_TIMEZONE ?? "Africa/Windhoek";
  }

  private get lookbackDays(): number {
    const parsed = Number(process.env.ANALYTICS_ETL_LOOKBACK_DAYS ?? 3);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 3;
  }

  async runIncremental(): Promise<EtlRunResult | null> {
    const today = localDateIn(new Date(), this.windowTimezone);
    let windowFrom = addDays(today, -(this.lookbackDays - 1));

    // Offline tablet check-ins can reach the server days after they happened.
    // Widen the window to cover any local date touched by a visit accepted
    // since the last successful run started.
    const lastSuccess = await this.lastSucceededRun();
    if (lastSuccess) {
      const result = await this.db.execute(sql`
        SELECT min((v.checked_in_at AT TIME ZONE s.timezone)::date)::text AS earliest
        FROM visitor_visits v
        JOIN sites s ON s.id = v.site_id
        WHERE v.deleted_at IS NULL
          AND v.server_accepted_at > ${lastSuccess.startedAt}
      `);
      const earliest = (result.rows[0] as { earliest: string | null } | undefined)?.earliest ?? null;
      if (earliest && earliest < windowFrom) windowFrom = earliest;
    }

    return this.run("incremental", windowFrom, today, null);
  }

  async runBackfill(from: string | null, to: string | null, requestedBy: string | null): Promise<EtlRunResult | null> {
    const today = localDateIn(new Date(), this.windowTimezone);
    let windowFrom = from;
    if (!windowFrom) {
      const result = await this.db.execute(sql`
        SELECT min((v.checked_in_at AT TIME ZONE s.timezone)::date)::text AS earliest
        FROM visitor_visits v
        JOIN sites s ON s.id = v.site_id
        WHERE v.deleted_at IS NULL
      `);
      windowFrom = (result.rows[0] as { earliest: string | null } | undefined)?.earliest ?? today;
    }
    return this.run("backfill", windowFrom, to ?? today, requestedBy);
  }

  async recentRuns(limit = 20) {
    const [runs, statusRows] = await Promise.all([
      this.db.select().from(analyticsEtlRun).orderBy(desc(analyticsEtlRun.startedAt)).limit(limit),
      this.db.execute(
        sql`SELECT id, domain, code FROM type_definition WHERE domain IN ('etl_run_status', 'etl_run_kind')`,
      ),
    ]);
    const codeById = new Map((statusRows.rows as { id: string; code: string }[]).map((r) => [r.id, r.code]));
    return runs.map((r) => ({
      id: r.id,
      kind: codeById.get(r.runKindCode) ?? null,
      status: codeById.get(r.statusCode) ?? null,
      windowFrom: r.windowFrom,
      windowTo: r.windowTo,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      rowsWritten: r.rowsWritten,
      sourceVisitCount: r.sourceVisitCount,
      factVisitCount: r.factVisitCount,
      errorMessage: r.errorMessage,
    }));
  }

  /**
   * Cross-organisation arrival statistics by Namibian region and visitor
   * type: the anonymised feed offered to the Namibia Tourism Board. Counts
   * only, no property names; any cell under ANALYTICS_MIN_CELL is returned
   * as null with suppressed: true, never as 0.
   */
  async arrivalStatistics(from: string, to: string) {
    const minCell = minCellThreshold();
    const result = await this.db.execute(sql`
      SELECT COALESCE(r.label, 'Region not set') AS region, r.sort_order AS region_order,
             vt.label AS visitor_type, sum(f.check_in_count)::int AS count
      FROM visit_daily_fact f
      JOIN sites s ON s.id = f.site_id
      LEFT JOIN type_definition r ON r.id = s.namibia_region_code
      JOIN type_definition vt ON vt.id = f.visitor_type_code
      WHERE f.local_date BETWEEN ${from}::date AND ${to}::date
      GROUP BY 1, 2, 3
      HAVING sum(f.check_in_count) > 0
      ORDER BY 2 NULLS LAST, 1, 3
    `);
    const rows = result.rows as { region: string; visitor_type: string; count: number }[];
    const regionTotals = new Map<string, number>();
    for (const row of rows) regionTotals.set(row.region, (regionTotals.get(row.region) ?? 0) + Number(row.count));
    return {
      from,
      to,
      minCell,
      cells: rows.map((row) => ({
        region: row.region,
        visitorType: row.visitor_type,
        ...suppress(Number(row.count), minCell),
      })),
      regions: [...regionTotals.entries()].map(([region, total]) => ({ region, ...suppress(total, minCell) })),
    };
  }

  private async lastSucceededRun() {
    const succeeded = await this.typeDefs.id("etl_run_status", "succeeded");
    const [row] = await this.db
      .select({ startedAt: analyticsEtlRun.startedAt })
      .from(analyticsEtlRun)
      .where(eq(analyticsEtlRun.statusCode, succeeded))
      .orderBy(desc(analyticsEtlRun.startedAt))
      .limit(1);
    return row ?? null;
  }

  private async run(
    kind: EtlRunKind,
    windowFrom: string,
    windowTo: string,
    requestedBy: string | null,
  ): Promise<EtlRunResult | null> {
    if (this.running) {
      this.logger.warn(`Analytics ETL ${kind} skipped: a run is already in progress`);
      return null;
    }
    this.running = true;

    const [kindCode, runningCode, succeededCode, failedCode] = await Promise.all([
      this.typeDefs.id("etl_run_kind", kind),
      this.typeDefs.id("etl_run_status", "running"),
      this.typeDefs.id("etl_run_status", "succeeded"),
      this.typeDefs.id("etl_run_status", "failed"),
    ]);
    const runId = randomUUID();

    try {
      await this.db.insert(analyticsEtlRun).values({
        id: runId,
        runKindCode: kindCode,
        statusCode: runningCode,
        windowFrom,
        windowTo,
        requestedBy,
      });
      await this.db.insert(analyticsEtlRunStatusLog).values({
        id: randomUUID(),
        etlRunId: runId,
        fromStatusCode: null,
        toStatusCode: runningCode,
      });

      const rowsWritten = await this.load(runId, windowFrom, windowTo);
      const { sourceVisitCount, factVisitCount } = await this.reconcile(windowFrom, windowTo);
      const matches = sourceVisitCount === factVisitCount;
      const errorMessage = matches
        ? null
        : `Reconciliation failed: ${sourceVisitCount} source visits vs ${factVisitCount} in visit_daily_fact for ${windowFrom} to ${windowTo}`;

      await this.finish(runId, runningCode, matches ? succeededCode : failedCode, {
        rowsWritten,
        sourceVisitCount,
        factVisitCount,
        errorMessage,
      });
      if (!matches) this.logger.error(errorMessage);

      return {
        id: runId,
        status: matches ? "succeeded" : "failed",
        windowFrom,
        windowTo,
        rowsWritten,
        sourceVisitCount,
        factVisitCount,
        errorMessage,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Analytics ETL ${kind} failed: ${message}`);
      await this.finish(runId, runningCode, failedCode, {
        rowsWritten: 0,
        sourceVisitCount: null,
        factVisitCount: null,
        errorMessage: message,
      }).catch(() => undefined);
      return {
        id: runId,
        status: "failed",
        windowFrom,
        windowTo,
        rowsWritten: 0,
        sourceVisitCount: 0,
        factVisitCount: 0,
        errorMessage: message,
      };
    } finally {
      this.running = false;
    }
  }

  private async finish(
    runId: string,
    fromStatus: string,
    toStatus: string,
    fields: {
      rowsWritten: number;
      sourceVisitCount: number | null;
      factVisitCount: number | null;
      errorMessage: string | null;
    },
  ) {
    await this.db
      .update(analyticsEtlRun)
      .set({ statusCode: toStatus, finishedAt: new Date(), ...fields })
      .where(eq(analyticsEtlRun.id, runId));
    await this.db.insert(analyticsEtlRunStatusLog).values({
      id: randomUUID(),
      etlRunId: runId,
      fromStatusCode: fromStatus,
      toStatusCode: toStatus,
    });
  }

  /**
   * Zero every fact row in the window, then upsert fresh aggregates — all in
   * one batch (one transaction on neon-http). Zeroing first means a dimension
   * combination that no longer has visits (a soft-deleted or re-categorised
   * visit) drops to 0 instead of keeping a stale count.
   */
  private async load(runId: string, windowFrom: string, windowTo: string): Promise<number> {
    // UTC pre-filter one day wider on each side so the index on checked_in_at
    // is usable; the exact local-date predicate follows it.
    const utcFrom = addDays(windowFrom, -1);
    const utcTo = addDays(windowTo, 2);

    const [, daily, , hourly] = await this.db.batch([
      this.db.execute(sql`
        UPDATE visit_daily_fact
        SET check_in_count = 0, check_out_count = 0, offline_captured_count = 0,
            dwell_minutes_total = 0, dwell_sample_count = 0,
            etl_run_id = ${runId}, computed_at = NOW()
        WHERE local_date BETWEEN ${windowFrom}::date AND ${windowTo}::date
      `),
      this.db.execute(sql`
        INSERT INTO visit_daily_fact (
          id, organisation_id, site_id, local_date, visitor_type_code, arrival_channel_code,
          purpose_category_code, check_in_count, check_out_count, offline_captured_count,
          dwell_minutes_total, dwell_sample_count, etl_run_id, computed_at
        )
        SELECT
          gen_random_uuid(), v.organisation_id, v.site_id,
          (v.checked_in_at AT TIME ZONE s.timezone)::date,
          v.visitor_category_code, v.arrival_channel_code, v.purpose_category_code,
          count(*)::int,
          count(v.checked_out_at)::int,
          count(*) FILTER (WHERE v.offline_captured)::int,
          COALESCE(round(sum(EXTRACT(EPOCH FROM (v.checked_out_at - v.checked_in_at)) / 60)
            FILTER (WHERE v.checked_out_at > v.checked_in_at
                    AND v.checked_out_at - v.checked_in_at < INTERVAL '24 hours')::numeric, 2), 0),
          count(*) FILTER (WHERE v.checked_out_at > v.checked_in_at
                           AND v.checked_out_at - v.checked_in_at < INTERVAL '24 hours')::int,
          ${runId}, NOW()
        FROM visitor_visits v
        JOIN sites s ON s.id = v.site_id
        WHERE v.deleted_at IS NULL
          AND v.checked_in_at >= ${utcFrom}::date
          AND v.checked_in_at < ${utcTo}::date
          AND (v.checked_in_at AT TIME ZONE s.timezone)::date BETWEEN ${windowFrom}::date AND ${windowTo}::date
        GROUP BY v.organisation_id, v.site_id, (v.checked_in_at AT TIME ZONE s.timezone)::date,
                 v.visitor_category_code, v.arrival_channel_code, v.purpose_category_code
        ON CONFLICT (organisation_id, site_id, local_date, visitor_type_code, arrival_channel_code, purpose_category_code)
        DO UPDATE SET
          check_in_count = EXCLUDED.check_in_count,
          check_out_count = EXCLUDED.check_out_count,
          offline_captured_count = EXCLUDED.offline_captured_count,
          dwell_minutes_total = EXCLUDED.dwell_minutes_total,
          dwell_sample_count = EXCLUDED.dwell_sample_count,
          etl_run_id = EXCLUDED.etl_run_id,
          computed_at = EXCLUDED.computed_at
      `),
      this.db.execute(sql`
        UPDATE visit_hourly_fact
        SET check_in_count = 0, etl_run_id = ${runId}, computed_at = NOW()
        WHERE local_date BETWEEN ${windowFrom}::date AND ${windowTo}::date
      `),
      this.db.execute(sql`
        INSERT INTO visit_hourly_fact (id, organisation_id, site_id, local_date, local_hour, check_in_count, etl_run_id, computed_at)
        SELECT
          gen_random_uuid(), v.organisation_id, v.site_id,
          (v.checked_in_at AT TIME ZONE s.timezone)::date,
          EXTRACT(HOUR FROM (v.checked_in_at AT TIME ZONE s.timezone))::smallint,
          count(*)::int, ${runId}, NOW()
        FROM visitor_visits v
        JOIN sites s ON s.id = v.site_id
        WHERE v.deleted_at IS NULL
          AND v.checked_in_at >= ${utcFrom}::date
          AND v.checked_in_at < ${utcTo}::date
          AND (v.checked_in_at AT TIME ZONE s.timezone)::date BETWEEN ${windowFrom}::date AND ${windowTo}::date
        GROUP BY v.organisation_id, v.site_id, (v.checked_in_at AT TIME ZONE s.timezone)::date,
                 EXTRACT(HOUR FROM (v.checked_in_at AT TIME ZONE s.timezone))
        ON CONFLICT (organisation_id, site_id, local_date, local_hour)
        DO UPDATE SET
          check_in_count = EXCLUDED.check_in_count,
          etl_run_id = EXCLUDED.etl_run_id,
          computed_at = EXCLUDED.computed_at
      `),
    ]);

    return (daily.rowCount ?? 0) + (hourly.rowCount ?? 0);
  }

  private async reconcile(windowFrom: string, windowTo: string) {
    const result = await this.db.execute(sql`
      SELECT
        (SELECT count(*)::int
           FROM visitor_visits v
           JOIN sites s ON s.id = v.site_id
          WHERE v.deleted_at IS NULL
            AND (v.checked_in_at AT TIME ZONE s.timezone)::date BETWEEN ${windowFrom}::date AND ${windowTo}::date
        ) AS source_count,
        (SELECT COALESCE(sum(check_in_count), 0)::int
           FROM visit_daily_fact
          WHERE local_date BETWEEN ${windowFrom}::date AND ${windowTo}::date
        ) AS fact_count
    `);
    const row = result.rows[0] as { source_count: number; fact_count: number };
    return { sourceVisitCount: Number(row.source_count), factVisitCount: Number(row.fact_count) };
  }
}
