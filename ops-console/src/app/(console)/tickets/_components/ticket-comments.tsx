"use client";

import { useActionState } from "react";

import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { addCommentAction } from "../actions";

export interface Comment {
  id: string;
  authorId: string;
  authorTypeCode: string;
  body: string;
  createdAt: string;
}

/**
 * Ticket detail's comment thread — the actual staff<->organisation
 * messaging capability (migration 0028). `authorTypeLabel` resolves
 * authorTypeCode to "Buffr staff" / "Organisation member" so a reader can
 * tell who said what without decoding a type_definition id by eye.
 */
export function TicketComments({
  ticketId,
  comments,
  authorTypeLabel,
}: {
  ticketId: string;
  comments: Comment[];
  authorTypeLabel: Map<string, string>;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => addCommentAction(formData),
    {},
  );

  return (
    <div>
      <div className="space-y-2">
        {comments.length === 0 ? <p className="text-slate text-sm">No comments yet.</p> : null}
        {comments.map((c) => {
          const isOrg = authorTypeLabel.get(c.authorTypeCode) === "Organisation member";
          return (
            <div
              key={c.id}
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                isOrg ? "mr-auto bg-secondary" : "ml-auto bg-sodium-yellow/15",
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {authorTypeLabel.get(c.authorTypeCode) ?? "unknown"}
                </Badge>
                <span className="text-slate text-xs">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-foreground">{c.body}</p>
            </div>
          );
        })}
      </div>
      <form action={formAction} className="mt-3 flex gap-2">
        <input type="hidden" name="ticketId" value={ticketId} />
        <Input name="body" placeholder="Reply…" required className="flex-1" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Reply"}
        </Button>
      </form>
      {state?.error ? <p className="mt-1 text-destructive text-xs">{state.error}</p> : null}
    </div>
  );
}
