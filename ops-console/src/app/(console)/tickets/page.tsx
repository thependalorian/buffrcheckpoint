import { BulkQueueList } from "@/components/bulk-queue-list";
import { TrendChart } from "@/components/charts/TrendChart";
import { DashboardErrorState, EmptyState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgOptions } from "@/lib/orgs";

import { CreateTicketForm, TICKET_STATUSES } from "./_components/ticket-controls";

interface Ticket {
  id: string;
  subject: string;
  organisationId: string | null;
  createdAt: string;
}

interface ResolutionPoint {
  period: string;
  count: number;
}

export default async function TicketsPage() {
  const result = await loadOrError(async () => {
    const [tickets, orgs, resolutionTrend] = await Promise.all([
      apiFetch<Ticket[]>("/platform/tickets"),
      loadOrgOptions(),
      apiFetch<ResolutionPoint[]>("/platform/dashboard/ticket-resolution-trend"),
    ]);
    return { tickets, orgs, resolutionTrend };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Support Tickets</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { tickets, orgs, resolutionTrend } = result.data;
  const orgLabel = Object.fromEntries(orgs.map((o) => [o.id, o.label]));

  return (
    <div>
      <h1 className="font-heading font-light text-2xl text-foreground">Support Tickets</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        In-console ticketing for platform ops — not an external tool link.
      </p>

      {resolutionTrend.length > 1 ? (
        <div className="mt-6">
          <TrendChart
            title="Median hours to resolve"
            finding="How long a ticket sits open before its first resolution, by the week it closed — not just how many tickets moved."
            data={resolutionTrend.map((t) => ({ period: t.period, value: t.count }))}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-2 font-medium text-sm">Open a ticket</h2>
        <div className="bc-panel">
          <CreateTicketForm orgs={orgs} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-medium text-sm">Open & recent</h2>
        {tickets.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            description="Open a ticket above when a customer issue needs tracking across CRM, billing, or support access."
          />
        ) : (
          <div className="bc-panel overflow-hidden p-0!">
            <BulkQueueList
              kind="ticket"
              statuses={TICKET_STATUSES}
              rows={tickets.map((ticket) => ({
                id: ticket.id,
                title: ticket.subject,
                href: `/tickets/${ticket.id}`,
                subtitle: `${
                  ticket.organisationId ? (orgLabel[ticket.organisationId] ?? ticket.organisationId) : "internal"
                } · ${new Date(ticket.createdAt).toLocaleString()}`,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
