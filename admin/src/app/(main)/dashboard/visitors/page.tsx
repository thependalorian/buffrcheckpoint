import type { VisitRosterRow } from "@/components/features/visits/visit-roster-table/schema";
import { VisitRosterTable } from "@/components/features/visits/visit-roster-table/table";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { api } from "@/lib/api/client";

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  let rows: VisitRosterRow[] = [];
  let error: string | null = null;
  try {
    // A date range switches to the uncapped, date-filtered search endpoint —
    // /visits/roster's 200-row cap silently drops older matches, which is
    // exactly wrong for "pull everyone who visited on this date."
    if (from || to) {
      const qs = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), limit: "200" });
      const result = await api.get<{ rows: VisitRosterRow[]; nextCursor: string | null }>(
        `/visits/roster/search?${qs.toString()}`,
      );
      rows = result.rows;
    } else {
      rows = await api.get<VisitRosterRow[]>("/visits/roster?open=false");
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load visit records.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Visitors" description="Visits and visitor records within authorised scope." />
      {error ? <DashboardErrorState message={error} /> : <VisitRosterTable data={rows} dateRange={{ from, to }} />}
    </div>
  );
}
