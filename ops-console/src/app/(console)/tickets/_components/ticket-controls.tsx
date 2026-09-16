"use client";

import { useActionState } from "react";

import { type OrgOption, OrgSelect } from "@/components/org-select";
import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusSelect } from "@/components/ui/status-select";

import { createTicketAction, updateTicketStatusAction } from "../actions";

const SEVERITIES = ["low", "medium", "high", "urgent"];

/** ticket_status codes. Exported because the queue's bulk bar offers the same set. */
export const TICKET_STATUSES = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"];

export function CreateTicketForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createTicketAction(formData),
    {},
  );

  return (
    <CardForm action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input name="subject" placeholder="Subject" required />
        <OrgSelect name="organisationId" orgs={orgs} optionalLabel="Internal (no org)" />
        <NativeSelect name="severityCode" required defaultValue="medium">
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <Input name="description" placeholder="Description" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Open ticket"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </CardForm>
  );
}

// Still used by the ticket detail page; the queue view uses BulkQueueList,
// which carries its own per-row select alongside the checkboxes.
export function TicketStatusControls({ ticketId }: { ticketId: string }) {
  return (
    <StatusSelect
      options={TICKET_STATUSES.map((s) => ({ value: s, label: s }))}
      onChange={(next) => updateTicketStatusAction(ticketId, next)}
    />
  );
}
