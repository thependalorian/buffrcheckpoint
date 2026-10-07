import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { BcStatRow, BcStatTile } from "@/components/bc-panel";
import { api } from "@/lib/api/client";
import { privacyRequestsCopy } from "@/lib/copy/privacy-requests";

interface ComplianceDashboard {
  retentionActionsDue: number;
  openDeletionRequests: number;
  dataRequestsDueSoon: number;
  dataRequestsOverdue: number;
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

  /** Refero clarity: top 4 KPIs; role-changes stays secondary copy below. */
  const primaryKpis = dashboard
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
      ]
    : [];

  return (
    <div className="min-w-0 space-y-6">
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
        <>
          <BcStatRow>
            {primaryKpis.map((kpi) => (
              <BcStatTile key={kpi.label} label={kpi.label} value={kpi.value} flagged={kpi.flagged} />
            ))}
          </BcStatRow>
          {dashboard ? (
            <p
              className={
                dashboard.dataRequestsOverdue > 0 ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"
              }
            >
              {dashboard.dataRequestsOverdue + dashboard.dataRequestsDueSoon === 0
                ? privacyRequestsCopy.dashboard.allClear
                : `${privacyRequestsCopy.dashboard.overdue}: ${dashboard.dataRequestsOverdue}. ${privacyRequestsCopy.dashboard.dueSoon}: ${dashboard.dataRequestsDueSoon}.`}
            </p>
          ) : null}
          {dashboard ? (
            <p className="text-sm text-muted-foreground">
              Role changes this month:{" "}
              <span className="font-medium tabular-nums text-foreground">{dashboard.roleChangesThisMonth}</span>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
