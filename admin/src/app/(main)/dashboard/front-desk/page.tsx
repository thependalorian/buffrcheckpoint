import type { VisitRosterRow } from "@/app/(main)/dashboard/default/_components/recent-customers-table/schema";
import { VisitRosterTable } from "@/app/(main)/dashboard/default/_components/recent-customers-table/table";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState } from "@/components/dashboard-state";
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
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <>
          {queue.length > 0 ? (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-medium">Reception wait queue</h2>
              <ul className="mt-3 space-y-2">
                {queue.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between text-sm">
                    <span>
                      Ticket #{entry.queueNumber} · {entry.statusCode}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(entry.enqueuedAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <VisitRosterTable data={rows} />
        </>
      )}
    </div>
  );
}
