import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

import type { DashboardMetrics } from "./_components/metric-cards";
import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview, type VisitActivityPoint } from "./_components/performance-overview";
import type { VisitRosterRow } from "./_components/recent-customers-table/schema";
import { SubscriberOverview } from "./_components/subscriber-overview";

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
      {coreError ? <DashboardErrorState message={coreError} /> : null}
      {complianceResult.error ? <DashboardErrorState message={complianceResult.error} /> : null}
      <MetricCards metrics={metrics} />
      <PerformanceOverview data={activity} />
      <SubscriberOverview visits={roster} />
    </div>
  );
}
