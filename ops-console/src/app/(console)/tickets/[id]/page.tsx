import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

import { RequestGrantForm } from "../../organisations/_components/request-grant-form";
import { type Comment, TicketComments } from "../_components/ticket-comments";
import { TicketStatusControls } from "../_components/ticket-controls";

interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  organisationId: string | null;
  severityCode: string;
  statusCode: string;
  createdAt: string;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await loadOrError(async () => {
    const [ticket, comments, severities, statuses, authorTypes, orgLabel] = await Promise.all([
      apiFetch<Ticket>(`/platform/tickets/${id}`),
      apiFetch<Comment[]>(`/platform/tickets/${id}/comments`),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=ticket_severity"),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=ticket_status"),
      apiFetch<TypeDefinitionRow[]>("/type-definitions?domain=support_ticket_comment_author_type"),
      loadOrgLabelMap(),
    ]);
    return { ticket, comments, severities, statuses, authorTypes, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Ticket</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { ticket, comments, severities, statuses, authorTypes, orgLabel } = result.data;
  const severityLabel = new Map(severities.map((s) => [s.id, s.label]));
  const statusLabel = new Map(statuses.map((s) => [s.id, s.label]));
  const authorTypeLabel = new Map(authorTypes.map((s) => [s.id, s.label]));

  return (
    <div>
      <Link href="/tickets" className="text-slate text-xs hover:text-foreground">
        ← All tickets
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-light text-2xl text-foreground">{ticket.subject}</h1>
          <p className="mt-1 text-slate text-sm">
            {severityLabel.get(ticket.severityCode) ?? "unknown"} · {statusLabel.get(ticket.statusCode) ?? "unknown"} ·{" "}
            {ticket.organisationId ? (
              <Link href={`/organisations/${ticket.organisationId}`} className="hover:underline">
                {orgLabel[ticket.organisationId] ?? ticket.organisationId}
              </Link>
            ) : (
              "internal"
            )}{" "}
            · opened {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>
        <TicketStatusControls ticketId={ticket.id} />
      </div>

      {ticket.description ? <p className="mt-4 text-foreground text-sm">{ticket.description}</p> : null}

      {ticket.organisationId ? (
        <div className="mt-4">
          <RequestGrantForm organisationId={ticket.organisationId} />
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="font-medium text-foreground text-sm">Thread</h2>
        <div className="mt-2">
          <TicketComments ticketId={ticket.id} comments={comments} authorTypeLabel={authorTypeLabel} />
        </div>
      </div>
    </div>
  );
}
