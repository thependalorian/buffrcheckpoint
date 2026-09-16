import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";

interface ComplianceDashboard {
  retentionActionsDue: number;
  openDeletionRequests: number;
  privilegedAccessEvents: number;
  offlineSyncExceptions: number;
  roleChangesThisMonth: number;
}

export default async function CompliancePage() {
  let dashboard: ComplianceDashboard | null = null;
  let error: string | null = null;
  try {
    dashboard = await api.get<ComplianceDashboard>("/compliance/dashboard");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the compliance dashboard.";
  }

  const kpis = dashboard
    ? [
        {
          label: "Retention actions due",
          value: dashboard.retentionActionsDue,
          flagged: dashboard.retentionActionsDue > 0,
        },
        {
          label: "Open deletion requests",
          value: dashboard.openDeletionRequests,
          flagged: dashboard.openDeletionRequests > 0,
        },
        {
          label: "Privileged access events",
          value: dashboard.privilegedAccessEvents,
          flagged: dashboard.privilegedAccessEvents > 0,
        },
        {
          label: "Offline sync exceptions",
          value: dashboard.offlineSyncExceptions,
          flagged: dashboard.offlineSyncExceptions > 0,
        },
        { label: "Role changes this month", value: dashboard.roleChangesThisMonth, flagged: false },
      ]
    : [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Compliance Dashboard"
        description="Retention exceptions, DSARs, offline-sync exceptions, and privileged access."
      />
      <p className="text-sm text-muted-foreground">
        Manage the DSAR queue (including distinct account-deletion requests) under{" "}
        <a href="/dashboard/compliance/privacy-requests" className="underline underline-offset-2">
          Privacy Requests
        </a>
        .
      </p>
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className={kpi.flagged ? "border-amber-500/40" : undefined}>
              <CardHeader>
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className={kpi.flagged ? "text-3xl text-amber-600 dark:text-amber-400" : "text-3xl"}>
                  {kpi.value}
                </CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
