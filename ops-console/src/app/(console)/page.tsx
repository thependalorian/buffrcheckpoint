import Link from "next/link";

import { BcStatRow, BcStatTile } from "@/components/bc-panel";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { DashboardErrorState } from "@/components/dashboard-state";
import { NamibiaMap } from "@/components/map/NamibiaMap";
import { Button } from "@/components/ui/button";
import { apiFetch, loadOrError } from "@/lib/api";

interface OverviewKpis {
  organisationCount: number;
  siteCount: number;
  mtdVisitVolume: number;
  activeDeviceCount: number;
  openIncidentCount: number;
  highChurnRiskOrgCount: number;
}

interface RegionRow {
  regionCode: string;
  siteCount: number;
}

interface VolumeTrendRow {
  period: string;
  count: number;
}

function toTrendPoints(rows: VolumeTrendRow[]): TrendPoint[] {
  return rows.map((r) => ({
    period: new Date(r.period).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: r.count,
  }));
}

export default async function OverviewPage() {
  const result = await loadOrError(async () => {
    const [kpis, regions, incidentTrend, ticketTrend] = await Promise.all([
      apiFetch<OverviewKpis>("/platform/dashboard/overview"),
      apiFetch<RegionRow[]>("/platform/dashboard/regions"),
      apiFetch<VolumeTrendRow[]>("/platform/dashboard/incident-trend"),
      apiFetch<VolumeTrendRow[]>("/platform/dashboard/ticket-trend"),
    ]);
    return { kpis, regions, incidentTrend, ticketTrend };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl text-foreground">Overview</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { kpis, regions, incidentTrend, ticketTrend } = result.data;
  const values = Object.fromEntries(regions.map((r) => [r.regionCode, r.siteCount || null]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">Overview</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Portfolio-wide aggregates only — visitor PII stays behind a customer-approved support grant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/organisations">Organisations</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/support-access">Support access</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/analytics">Churn queue</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <BcStatRow>
          <BcStatTile label="Organisations" value={kpis.organisationCount} />
          <BcStatTile label="Sites" value={kpis.siteCount} />
          <BcStatTile label="Open incidents" value={kpis.openIncidentCount} flagged={kpis.openIncidentCount > 0} />
          <BcStatTile
            label="High churn risk"
            value={kpis.highChurnRiskOrgCount}
            flagged={kpis.highChurnRiskOrgCount > 0}
          />
        </BcStatRow>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        MTD visit volume:{" "}
        <span className="font-medium tabular-nums text-foreground">{kpis.mtdVisitVolume}</span>
        {" · "}
        Active devices:{" "}
        <span className="font-medium tabular-nums text-foreground">{kpis.activeDeviceCount}</span>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <TrendChart
          title="Incidents opened, weekly"
          finding="How the open-incident rate is moving, not just today's count."
          data={toTrendPoints(incidentTrend)}
          drillHref="/incidents"
          drillLabel="View incident queue"
        />
        <TrendChart
          title="Tickets created, weekly"
          finding="Support-load trend across all organisations."
          data={toTrendPoints(ticketTrend)}
          drillHref="/tickets"
          drillLabel="View ticket queue"
        />
      </div>

      <div className="bc-panel mt-8">
        <div className="bc-panel-header">
          <p className="font-heading font-medium text-lg leading-none">Site density by region</p>
          <p className="mt-1 text-muted-foreground text-sm font-normal">
            Namibian administrative regions — hatched regions have no sites yet.
          </p>
        </div>
        <NamibiaMap values={values} caption="Sites per Namibian administrative region." />
      </div>
    </div>
  );
}
