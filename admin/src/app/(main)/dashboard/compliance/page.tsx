import Link from "next/link";

import { BcPanel, BcStatRow, BcStatTile } from "@/components/bc-panel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
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

  const kpi = (label: string, value: number, href: string, hint: string) => ({
    label,
    value,
    href,
    hint,
    flagged: value > 0,
  });
  const primaryKpis = dashboard
    ? [
        kpi(
          "Retention actions due",
          dashboard.retentionActionsDue,
          "/dashboard/policies/retention",
          "Records past their retention period",
        ),
        kpi(
          "Open deletion requests",
          dashboard.openDeletionRequests,
          "/dashboard/compliance/privacy-requests",
          "Account deletions awaiting action",
        ),
        kpi(
          "Privileged access events",
          dashboard.privilegedAccessEvents,
          "/dashboard/audit",
          "Support and admin access to review",
        ),
        kpi(
          "Offline sync exceptions",
          dashboard.offlineSyncExceptions,
          "/dashboard/devices/compliance",
          "Kiosk captures that did not sync",
        ),
      ]
    : [];
  const dsarOpen = dashboard ? dashboard.dataRequestsOverdue + dashboard.dataRequestsDueSoon : 0;

  return (
    <div className="min-w-0 space-y-6">
      <DashboardPageHeader
        title="Compliance Dashboard"
        description="Retention exceptions, DSARs, offline-sync exceptions, and privileged access."
        status={
          dashboard ? (
            dashboard.dataRequestsOverdue > 0 ? (
              <StatusChip tone="danger">{dashboard.dataRequestsOverdue} overdue</StatusChip>
            ) : dsarOpen > 0 ? (
              <StatusChip tone="warning">{dsarOpen} due soon</StatusChip>
            ) : (
              <StatusChip tone="success">On track</StatusChip>
            )
          ) : null
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/compliance/privacy-requests">Privacy requests</Link>
          </Button>
        }
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : dashboard ? (
        <>
          <section aria-labelledby="needs-action" className="space-y-3">
            <h2 id="needs-action" className="bc-h-section">
              Needs action
            </h2>
            <BcStatRow>
              {primaryKpis.map((item) => (
                <BcStatTile key={item.label} {...item} />
              ))}
            </BcStatRow>
          </section>
          <BcPanel header={<span>Posture</span>}>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Data request clock</dt>
                <dd className="mt-1">
                  {dsarOpen === 0 ? (
                    <StatusChip tone="success">{privacyRequestsCopy.dashboard.allClear}</StatusChip>
                  ) : (
                    <span className="flex flex-wrap gap-2">
                      <StatusChip tone={dashboard.dataRequestsOverdue > 0 ? "danger" : "info"}>
                        {privacyRequestsCopy.dashboard.overdue}: {dashboard.dataRequestsOverdue}
                      </StatusChip>
                      <StatusChip tone="warning">
                        {privacyRequestsCopy.dashboard.dueSoon}: {dashboard.dataRequestsDueSoon}
                      </StatusChip>
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role changes this month</dt>
                <dd className="mt-1 font-medium tabular-nums">{dashboard.roleChangesThisMonth}</dd>
              </div>
            </dl>
          </BcPanel>
        </>
      ) : null}
    </div>
  );
}
