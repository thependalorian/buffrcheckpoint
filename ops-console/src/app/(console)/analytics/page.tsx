import Link from "next/link";

import { ScoreScatter } from "@/components/charts/ScoreScatter";
import { ShareBars } from "@/components/charts/ShareBars";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { DashboardErrorState, EmptyState, TableEmptyRow } from "@/components/dashboard-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgOptions } from "@/lib/orgs";

import {
  type ArrivalStatistics,
  ArrivalStatisticsPanel,
  EtlHealthPanel,
  type EtlRunRow,
} from "./_components/analytics-data-panels";

interface ChurnRow {
  organisationId: string;
  healthScore: string;
  churnRiskBandCode: string;
  mrr: number;
  expectedValue: number;
  computedAt: string;
}

interface SegmentationRow {
  organisationId: string;
  organisationName: string;
  healthScore: number;
  mrr: number;
}

interface RetentionRow {
  week: number;
  retentionRate: number;
  orgCount: number;
}

interface VisitVolumePoint {
  period: string;
  count: number;
}

interface DeliveryHealthPoint {
  period: string;
  total: number;
  sent: number;
  failed: number;
  successRate: number;
}

interface ComplianceShareRow {
  statusCode: string;
  label: string;
  count: number;
}

/**
 * The billing, KYB, and ticket series each sit behind their own permission
 * (platform.billing.manage, platform.kyb.review, platform.ticket.manage), so
 * they are fetched individually rather than inside the page's main
 * Promise.all: a compliance-only staff account legitimately holds none of
 * them, and one 403 should hide one chart, not blank the page.
 */
async function loadSeries<T>(path: string, fallback: T): Promise<T> {
  const result = await loadOrError(() => apiFetch<T>(path));
  return result.data ?? fallback;
}

/** Weekly buckets come back as timestamps; the axis only needs the date. */
function shortPeriod(period: string): string {
  return period.slice(0, 10);
}

// Matches organisation-health.service.ts's own band cutoff (score >= 40 is
// not "high" risk) — same threshold the nightly scorecard already uses,
// not a new number invented for this chart.
const HIGH_RISK_THRESHOLD = 40;

export default async function AnalyticsPage() {
  const result = await loadOrError(async () => {
    const [queue, orgs, segmentation, retention, visitVolume] = await Promise.all([
      apiFetch<ChurnRow[]>("/platform/dashboard/churn-queue"),
      loadOrgOptions(),
      apiFetch<SegmentationRow[]>("/platform/dashboard/account-segmentation"),
      apiFetch<RetentionRow[]>("/platform/dashboard/retention-curve"),
      apiFetch<VisitVolumePoint[]>("/platform/dashboard/visit-volume-trend"),
    ]);
    return { queue, orgs, segmentation, retention, visitVolume };
  });

  // Ticket resolution time lives on the tickets queue, next to the tickets it
  // describes, rather than being repeated here.
  const [etlRuns, arrivalStats] = await Promise.all([
    loadSeries<EtlRunRow[]>("/platform/analytics/etl-runs", []),
    loadSeries<ArrivalStatistics | null>("/platform/analytics/arrival-statistics", null),
  ]);

  const [mrr, kybThroughput, deliveryHealth, complianceShares] = await Promise.all([
    loadSeries<VisitVolumePoint[]>("/platform/dashboard/mrr-trend", []),
    loadSeries<VisitVolumePoint[]>("/platform/dashboard/kyb-throughput-trend", []),
    loadSeries<DeliveryHealthPoint[]>("/platform/dashboard/notification-delivery-trend", []),
    loadSeries<ComplianceShareRow[]>("/platform/dashboard/device-compliance-shares", []),
  ]);

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Analytics</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { queue, orgs, segmentation, retention, visitVolume } = result.data;
  const orgLabel = Object.fromEntries(orgs.map((o) => [o.id, o.label]));
  const retentionPoints: TrendPoint[] = retention.map((r) => ({
    period: `wk ${r.week}`,
    value: Math.round(r.retentionRate * 100),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">Analytics</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Expected-Value ranked (risk × MRR) — who is worth an intervention this week.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/organisations">Browse organisations</Link>
        </Button>
      </div>

      <div className="mt-6">
        <EtlHealthPanel runs={etlRuns} />
      </div>

      {arrivalStats && arrivalStats.cells.length > 0 ? (
        <div className="mt-6">
          <ArrivalStatisticsPanel stats={arrivalStats} />
        </div>
      ) : null}

      {retentionPoints.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="Account health retention by week since first observed"
            finding="Of orgs first observed N weeks ago, the share still not high-risk (score ≥ 40) that week."
            data={retentionPoints}
          />
          <p className="mt-2 text-muted-foreground text-xs">
            Proxy, not signup-date retention: organisations has no signup-date column, so week 0 is each
            organisation&apos;s first computed health snapshot, not its actual onboarding date.
          </p>
        </div>
      ) : null}

      {visitVolume.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="Platform-wide visit volume"
            finding="Weekly check-ins across every organisation — the platform's own usage pulse, not a per-org health signal."
            data={visitVolume.map((v) => ({ period: v.period, value: v.count }))}
          />
        </div>
      ) : null}

      {mrr.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="Recurring revenue by month (NAD)"
            finding="Contracted MRR from active subscriptions — the revenue at risk when an account in the queue below churns."
            data={mrr.map((m) => ({ period: m.period, value: m.count }))}
            drillHref="/billing"
            drillLabel="Open billing"
          />
          <p className="mt-2 text-muted-foreground text-xs">
            Reconstructed, not a priced history: organisation_subscription stores one current MRR per subscription, so
            each month applies today&apos;s amount to the subscriptions that had started by then. Past price changes are
            not visible in the curve.
          </p>
        </div>
      ) : null}

      {kybThroughput.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="KYB decisions per week"
            finding="Verifications actually decided, not the size of the backlog — review throughput."
            data={kybThroughput.map((k) => ({ period: shortPeriod(k.period), value: k.count }))}
            drillHref="/kyb"
            drillLabel="Open KYB queue"
          />
        </div>
      ) : null}

      {deliveryHealth.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="Host-notification delivery success rate"
            finding="Share of notifications reaching the host each week. A drop here is a check-in that never notified anyone."
            data={deliveryHealth.map((d) => ({
              period: shortPeriod(d.period),
              value: Math.round(d.successRate * 100),
            }))}
          />
        </div>
      ) : null}

      {complianceShares.length > 0 ? (
        <div className="mt-6">
          <ShareBars
            title="Device fleet by CRAN compliance status"
            finding="Only approved_for_deployment devices may activate (Section 14.3a) — anything else is a kiosk that cannot go live."
            data={complianceShares.map((row) => ({ label: row.label, value: row.count }))}
            valueSuffix=" devices"
          />
        </div>
      ) : null}

      {segmentation.length > 0 ? (
        <div className="mt-6">
          <ScoreScatter
            title="Account segmentation — health vs. MRR"
            finding="Highest expected loss enters the queue below — not highest MRR alone."
            xLabel="Health score"
            yLabel="MRR (NAD)"
            thresholdX={HIGH_RISK_THRESHOLD}
            drillHrefBase="/organisations"
            data={segmentation.map((s) => ({
              id: s.organisationId,
              label: s.organisationName,
              x: s.healthScore,
              y: s.mrr,
              flagged: s.healthScore < HIGH_RISK_THRESHOLD,
            }))}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {queue.length === 0 ? (
          <EmptyState
            title="No health snapshots yet"
            description="The organisation-health worker writes nightly snapshots. Until then, use Organisations for MRR and lifecycle signals, and Support Access for interventions."
            actionHref="/organisations"
            actionLabel="Open organisations"
          />
        ) : (
          <div className="bc-panel overflow-x-auto p-0!">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Expected value</TableHead>
                  <TableHead>Computed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((row) => (
                  <TableRow key={row.organisationId}>
                    <TableCell>
                      <Link href={`/organisations/${row.organisationId}`} className="hover:underline">
                        {orgLabel[row.organisationId] ?? row.organisationId}
                      </Link>
                    </TableCell>
                    <TableCell>{Number(row.healthScore).toFixed(0)}/100</TableCell>
                    <TableCell>NAD {row.mrr.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{row.expectedValue.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.computedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {queue.length === 0 ? <TableEmptyRow colSpan={5} title="Empty" description="No rows" /> : null}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
