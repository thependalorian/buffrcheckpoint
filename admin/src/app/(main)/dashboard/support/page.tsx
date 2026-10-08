import Link from "next/link";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardErrorState, EmptyPanel } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { List, ListRow } from "@/components/ui/list";
import { api } from "@/lib/api/client";

import { CreateTicketForm } from "./_components/create-ticket-form";

interface Ticket {
  id: string;
  subject: string;
  severityCode: string;
  statusCode: string;
  createdAt: string;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

// The customer-facing half of support tickets (backend/src/modules/support-tickets)
// — a customer opens a ticket here and reads staff replies; platform_support
// works the same tickets from ops-console. Migration 0028 made the
// underlying comment table two-way instead of building a separate
// conversation schema.
export default async function SupportPage() {
  let tickets: Ticket[] = [];
  let statusLabel = new Map<string, string>();
  let severityLabel = new Map<string, string>();
  let error: string | null = null;
  try {
    const [ticketRows, statuses, severities] = await Promise.all([
      api.get<Ticket[]>("/tickets"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=ticket_status"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=ticket_severity"),
    ]);
    tickets = ticketRows;
    statusLabel = new Map(statuses.map((s) => [s.id, s.label]));
    severityLabel = new Map(severities.map((s) => [s.id, s.label]));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load support tickets.";
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Support"
        description="Open a ticket if you need help — Buffr's support team replies here."
      />
      {error ? (
        <DashboardErrorState message={error} />
      ) : (
        <>
          {tickets.length > 0 ? (
            <List>
              {tickets.map((t) => (
                <ListRow key={t.id}>
                  <Link
                    href={`/dashboard/support/${t.id}`}
                    className="font-medium text-foreground text-sm hover:underline"
                  >
                    {t.subject}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{severityLabel.get(t.severityCode) ?? "unknown"}</Badge>
                    <Badge>{statusLabel.get(t.statusCode) ?? "unknown"}</Badge>
                  </div>
                </ListRow>
              ))}
            </List>
          ) : (
            <EmptyPanel title="No tickets yet" description="Open a ticket below and Buffr support will reply here." />
          )}

          <section className="bc-panel space-y-4">
            <h2>Open a new ticket</h2>
            <CreateTicketForm />
          </section>
        </>
      )}
    </div>
  );
}
