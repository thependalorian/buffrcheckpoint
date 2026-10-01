import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
import { RosterLiveRefresh } from "@/components/features/visits/roster-live-refresh";
import type { VisitRosterRow } from "@/components/features/visits/visit-roster-table/schema";
import { VisitRosterTable } from "@/components/features/visits/visit-roster-table/table";
import { api } from "@/lib/api/client";

type QueueRow = {
  id: string;
  visitId: string;
  siteId: string;
  hostId: string;
  queueNumber: number;
  statusCode: string;
  enqueuedAt: string;
};

export default async function FrontDeskPage() {
  let rows: VisitRosterRow[] = [];
  let queue: QueueRow[] = [];
  let error: string | null = null;
  try {
    rows = await api.get<VisitRosterRow[]>("/visits/roster?open=true");
    try {
      queue = await api.get<QueueRow[]>("/visitor-wait-queue");
    } catch {
      queue = [];
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load the front-desk roster.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Front Desk"
        description="Live on-site roster, reception wait queue, pending approvals, assisted check-in, and check-out."
        action={<RosterLiveRefresh />}
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <>
          {queue.length > 0 ? (
            <div className="bc-panel">
              <h2 className="bc-panel-header text-sm font-medium">Reception wait queue</h2>
              <ul className="space-y-2">
                {queue.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 break-words">
                      Ticket #{entry.queueNumber} · {entry.statusCode}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(entry.enqueuedAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="bc-panel p-0! overflow-hidden">
            <VisitRosterTable data={rows} />
          </div>
        </>
      )}
    </div>
  );
}
