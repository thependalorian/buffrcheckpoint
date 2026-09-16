import type { VisitRosterRow } from "@/app/(main)/dashboard/default/_components/recent-customers-table/schema";
import { VisitRosterTable } from "@/app/(main)/dashboard/default/_components/recent-customers-table/table";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

export default async function VisitorsPage() {
  let rows: VisitRosterRow[] = [];
  let error: string | null = null;
  try {
    rows = await api.get<VisitRosterRow[]>("/visits/roster?open=false");
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load visit records.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Visitors" description="Visits and visitor records within authorised scope." />
      {error ? <DashboardErrorState message={error} /> : <VisitRosterTable data={rows} />}
    </div>
  );
}
