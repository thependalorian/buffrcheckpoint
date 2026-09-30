import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import type { VisitRosterRow } from "@/components/features/visits/visit-roster-table/schema";
import { api } from "@/lib/api/client";

import type { DashboardMetrics } from "./_components/operational-metric-cards";
import { OperationalMetricCards } from "./_components/operational-metric-cards";
import { OnSiteRosterPanel } from "./_components/on-site-roster-panel";
import { VisitActivityOverview, type VisitActivityPoint } from "./_components/visit-activity-overview";

interface ScheduleEvent {
  id: string;
  startsAt: string | null;
}

interface ComplianceDashboard {
  retentionActionsDue: number;
  openDeletionRequests: number;
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

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DashboardPageHeader
        title="Overview"
        description="On-site counts, visit activity, and compliance alerts for this organisation."
      />
      {coreError ? <DashboardErrorState message={coreError} /> : null}
      {complianceResult.error ? <DashboardErrorState message={complianceResult.error} /> : null}
      <OperationalMetricCards metrics={metrics} />
      <VisitActivityOverview data={activity} />
      <OnSiteRosterPanel visits={roster} />
    </div>
  );
}
