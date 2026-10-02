import Link from "next/link";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { anomaliesCopy, describeAlert } from "@/lib/copy/anomalies";

import { AlertReviewButtons } from "./_components/alert-review-buttons";
import { type AnomalyRule, SiteRulesForm } from "./_components/site-rules-form";

interface AlertRow {
  id: string;
  siteName: string;
  ruleCode: string;
  ruleLabel: string;
  payload: Record<string, string | number | null> | null;
  occurredAt: string;
  state: string;
}

interface SiteRow {
  id: string;
  name: string;
}

export default async function AnomaliesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state: stateParam } = await searchParams;
  const state = stateParam === "all" ? "all" : "open";
  let alerts: AlertRow[] = [];
  let openCount = 0;
  let error: string | null = null;
  try {
    const result = await api.get<{ alerts: AlertRow[]; openCount: number }>(`/anomaly-alerts?days=7&state=${state}`);
    alerts = result.alerts;
    openCount = result.openCount;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load anomaly alerts.";
  }

  // Rule settings need site.configure; users without it see alerts only.
  let siteRules: { site: SiteRow; rules: AnomalyRule[] }[] | null = null;
  try {
    const sites = await api.get<SiteRow[]>("/sites");
    siteRules = await Promise.all(
      sites.map(async (site) => ({ site, rules: await api.get<AnomalyRule[]>(`/sites/${site.id}/anomaly-rules`) })),
    );
  } catch {
    siteRules = null;
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={anomaliesCopy.title} description={anomaliesCopy.description} />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-sm">{anomaliesCopy.listHeading(openCount)}</h2>
            <div className="flex gap-3 text-sm">
              {(["open", "all"] as const).map((value) => (
                <Link
                  key={value}
                  href={`/dashboard/anomalies?state=${value}`}
                  className={value === state ? "font-medium underline" : "text-muted-foreground hover:underline"}
                >
                  {anomaliesCopy.filters[value]}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{anomaliesCopy.columns.when}</TableHead>
                  <TableHead>{anomaliesCopy.columns.site}</TableHead>
                  <TableHead>{anomaliesCopy.columns.rule}</TableHead>
                  <TableHead>{anomaliesCopy.columns.detail}</TableHead>
                  <TableHead>{anomaliesCopy.columns.state}</TableHead>
                  <TableHead>{anomaliesCopy.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {state === "open" ? anomaliesCopy.emptyOpen : anomaliesCopy.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {new Date(alert.occurredAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{alert.siteName}</TableCell>
                      <TableCell>{alert.ruleLabel}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {describeAlert(alert.ruleCode, alert.payload)}
                      </TableCell>
                      <TableCell>{anomaliesCopy.states[alert.state] ?? alert.state}</TableCell>
                      <TableCell>
                        <AlertReviewButtons alertId={alert.id} state={alert.state} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-sm">{anomaliesCopy.rulesHeading}</h2>
          <p className="text-muted-foreground text-sm">{anomaliesCopy.rulesDescription}</p>
        </div>
        {siteRules === null ? (
          <p className="text-muted-foreground text-sm">{anomaliesCopy.rulesUnavailable}</p>
        ) : (
          siteRules.map(({ site, rules }) => (
            <SiteRulesForm key={site.id} siteId={site.id} siteName={site.name} rules={rules} />
          ))
        )}
      </section>
    </div>
  );
}
