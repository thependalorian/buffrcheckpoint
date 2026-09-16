"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { replyToTicketAction } from "../../actions";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => replyToTicketAction(formData),
    {},
  );

  return (
    <form action={formAction} className="mt-3 flex gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Input name="body" placeholder="Reply…" required className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Reply"}
      </Button>
      {state?.error ? <span className="text-destructive text-xs">{state.error}</span> : null}
    </form>
  );
}
