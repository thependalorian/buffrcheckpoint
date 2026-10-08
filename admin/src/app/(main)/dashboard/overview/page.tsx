import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import type { VisitRosterRow } from "@/components/features/visits/visit-roster-table/schema";
import { StatusChip } from "@/components/status-chip";
import { api } from "@/lib/api/client";

import { type AttentionItem, AttentionPanel } from "./_components/attention-panel";
import { OnSiteRosterPanel } from "./_components/on-site-roster-panel";
import type { DashboardMetrics } from "./_components/operational-metric-cards";
import { OperationalMetricCards } from "./_components/operational-metric-cards";
import { VisitActivityOverview, type VisitActivityPoint } from "./_components/visit-activity-overview";

interface ScheduleEvent {
  id: string;
  startsAt: string | null;
}

interface ComplianceDashboard {
  retentionActionsDue: number;
  openDeletionRequests: number;
  dataRequestsOverdue?: number;
  privilegedAccessEvents: number;
  offlineSyncExceptions: number;
  roleChangesThisMonth: number;
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) === today;
}

async function loadSection<T>(loader: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    return { data: await loader(), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to load section." };
  }
}

export default async function Page() {
  const [rosterResult, activityResult, scheduleResult, complianceResult] = await Promise.all([
    loadSection(() => api.get<VisitRosterRow[]>("/visits/roster?open=true")),
    loadSection(() => api.get<VisitActivityPoint[]>("/analytics/visit-activity?days=90")),
    loadSection(() => api.get<ScheduleEvent[]>("/schedule")),
    loadSection(() => api.get<ComplianceDashboard>("/compliance/dashboard")),
  ]);

  const roster = rosterResult.data ?? [];
  const activity = activityResult.data ?? [];
  const scheduleToday = scheduleResult.data ?? [];
  const compliance = complianceResult.data;

  const coreError = rosterResult.error ?? activityResult.error ?? scheduleResult.error;

  if (coreError && !rosterResult.data && !activityResult.data && !scheduleResult.data) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <DashboardPageHeader
          title="Overview"
          description="On-site counts, visit activity, and compliance alerts for this organisation."
        />
        <DashboardErrorState message={coreError} />
      </div>
    );
  }

  const metrics: DashboardMetrics = {
    onSiteNow: roster.length,
    expectedToday: scheduleToday.filter((event) => isToday(event.startsAt)).length,
    pendingApprovals: roster.filter((row) => row.requiresAction).length,
    complianceAlerts: compliance
      ? compliance.retentionActionsDue + compliance.openDeletionRequests + compliance.offlineSyncExceptions
      : 0,
  };

  const attention: AttentionItem[] = compliance
    ? [
        { label: "Pending approvals", count: metrics.pendingApprovals, href: "/dashboard/front-desk", tone: "warning" },
        {
          label: "Overdue data requests",
          count: compliance.dataRequestsOverdue ?? 0,
          href: "/dashboard/compliance/privacy-requests",
          tone: "danger",
        },
        {
          label: "Open deletion requests",
          count: compliance.openDeletionRequests,
          href: "/dashboard/compliance/privacy-requests",
          tone: "warning",
        },
        {
          label: "Retention actions due",
          count: compliance.retentionActionsDue,
          href: "/dashboard/policies/retention",
          tone: "warning",
        },
        {
          label: "Offline sync exceptions",
          count: compliance.offlineSyncExceptions,
          href: "/dashboard/devices/compliance",
          tone: "warning",
        },
      ]
    : [{ label: "Pending approvals", count: metrics.pendingApprovals, href: "/dashboard/front-desk", tone: "warning" }];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DashboardPageHeader
        title="Overview"
        description="On-site counts, visit activity, and compliance alerts for this organisation."
        status={
          metrics.complianceAlerts > 0 ? (
            <StatusChip tone="warning">{metrics.complianceAlerts} to review</StatusChip>
          ) : (
            <StatusChip tone="success">All clear</StatusChip>
          )
        }
      />
      {coreError ? <DashboardErrorState message={coreError} /> : null}
      {complianceResult.error ? <DashboardErrorState message={complianceResult.error} /> : null}
      <OperationalMetricCards metrics={metrics} />
      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <VisitActivityOverview data={activity} />
        </div>
        <AttentionPanel items={attention} />
      </div>
      <OnSiteRosterPanel visits={roster} />
    </div>
  );
}
