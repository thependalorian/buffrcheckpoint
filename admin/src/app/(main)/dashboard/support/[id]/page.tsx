import Link from "next/link";

import { cn } from "cn";

import { DashboardErrorState } from "@/components/dashboard-state";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";

import { ReplyForm } from "./_components/reply-form";

interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  severityCode: string;
  statusCode: string;
  createdAt: string;
}

interface Comment {
  id: string;
  authorTypeCode: string;
  body: string;
  createdAt: string;
}

interface TypeDefinitionRow {
  id: string;
  code: string;
  label: string;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: {
    ticket: Ticket;
    comments: Comment[];
    statusLabel: Map<string, string>;
    severityLabel: Map<string, string>;
    authorTypeLabel: Map<string, string>;
  } | null = null;
  let error: string | null = null;

  try {
    const [ticket, comments, statuses, severities, authorTypes] = await Promise.all([
      api.get<Ticket>(`/tickets/${id}`),
      api.get<Comment[]>(`/tickets/${id}/comments`),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=ticket_status"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=ticket_severity"),
      api.get<TypeDefinitionRow[]>("/type-definitions?domain=support_ticket_comment_author_type"),
    ]);
    data = {
      ticket,
      comments,
      statusLabel: new Map(statuses.map((s) => [s.id, s.label])),
      severityLabel: new Map(severities.map((s) => [s.id, s.label])),
      authorTypeLabel: new Map(authorTypes.map((s) => [s.id, s.label])),
    };
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load this ticket.";
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Ticket</h1>
        <DashboardErrorState message={error ?? "API error 500"} />
      </div>
    );
  }

  const { ticket, comments, statusLabel, severityLabel, authorTypeLabel } = data;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/support" className="text-muted-foreground text-xs hover:text-foreground">
        ← All tickets
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-heading font-light text-2xl text-foreground">{ticket.subject}</h1>
          <Badge variant="secondary">{severityLabel.get(ticket.severityCode) ?? "unknown"}</Badge>
          <Badge>{statusLabel.get(ticket.statusCode) ?? "unknown"}</Badge>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">Opened {new Date(ticket.createdAt).toLocaleString()}</p>
        {ticket.description ? <p className="mt-3 text-foreground text-sm">{ticket.description}</p> : null}
      </div>

      <div>
        <h2 className="font-medium text-foreground text-sm">Thread</h2>
        <div className="mt-2 space-y-2">
          {comments.length === 0 ? <p className="text-muted-foreground text-sm">No replies yet.</p> : null}
          {comments.map((c) => {
            const isMine = authorTypeLabel.get(c.authorTypeCode) === "Organisation member";
            return (
              <div
                key={c.id}
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  isMine ? "ml-auto bg-primary/15" : "mr-auto bg-secondary",
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {authorTypeLabel.get(c.authorTypeCode) ?? "unknown"}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-foreground text-sm">{c.body}</p>
              </div>
            );
          })}
        </div>
        <ReplyForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
