import { VisitRosterTable } from "@/app/(main)/dashboard/default/_components/recent-customers-table/table";
import type { VisitRosterRow } from "@/app/(main)/dashboard/default/_components/recent-customers-table/schema";
import { EmergencyTriggerPanel } from "./_components/emergency-trigger-panel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

export default async function EmergencyPage() {
  let rows: VisitRosterRow[] = [];
  let sites: Array<{ id: string; name: string }> = [];
  let error: string | null = null;
  try {
    [rows, sites] = await Promise.all([
      api.get<VisitRosterRow[]>("/visits/roster?open=true"),
      api.get<Array<{ id: string; name: string }>>("/sites"),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the emergency roster.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Emergency Roster"
        description="Trigger a roll-call snapshot and review who is currently on site."
      />
      {sites.length > 0 ? <EmergencyTriggerPanel sites={sites} /> : null}
      {error ? <DashboardErrorState message={error} /> : <VisitRosterTable data={rows} />}
    </div>
  );
}
