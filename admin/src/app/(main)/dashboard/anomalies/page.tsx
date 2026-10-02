import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { anomaliesCopy, describeAlert } from "@/lib/copy/anomalies";

import { type AnomalyRule, SiteRulesForm } from "./_components/site-rules-form";

interface AlertRow {
  id: string;
  siteName: string;
  ruleCode: string;
  ruleLabel: string;
  payload: Record<string, string | number | null> | null;
  occurredAt: string;
}

interface SiteRow {
  id: string;
  name: string;
}

export default async function AnomaliesPage() {
  let alerts: AlertRow[] = [];
  let error: string | null = null;
  try {
    alerts = (await api.get<{ alerts: AlertRow[] }>("/anomaly-alerts?days=7")).alerts;
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
          <h2 className="font-medium text-sm">{anomaliesCopy.listHeading}</h2>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{anomaliesCopy.columns.when}</TableHead>
                  <TableHead>{anomaliesCopy.columns.site}</TableHead>
                  <TableHead>{anomaliesCopy.columns.rule}</TableHead>
                  <TableHead>{anomaliesCopy.columns.detail}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {anomaliesCopy.empty}
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
