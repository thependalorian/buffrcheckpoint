"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusSelect } from "@/components/ui/status-select";

import { createIncidentAction, updateIncidentStatusAction } from "../actions";

const SEVERITIES = ["low", "medium", "high", "critical"];

/** incident_status codes. Exported because the queue's bulk bar offers the same set. */
export const INCIDENT_STATUSES = ["open", "investigating", "monitoring", "resolved"];

export function CreateIncidentForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createIncidentAction(formData),
    {},
  );

  return (
    <CardForm action={formAction}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input name="title" placeholder="Title" required />
        <NativeSelect name="severityCode" required>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <Input name="description" placeholder="Description (optional)" />
      </div>
      <Button type="submit" disabled={pending} className="mt-3">
        {pending ? "Creating…" : "Open incident"}
      </Button>
      {state?.error ? <p className="mt-2 text-destructive text-xs">{state.error}</p> : null}
    </CardForm>
  );
}

// Still used by the incident detail page; the queue view uses BulkQueueList.
export function StatusControls({ incidentId }: { incidentId: string }) {
  return (
    <StatusSelect
      options={INCIDENT_STATUSES.map((s) => ({ value: s, label: s }))}
      onChange={(next) => updateIncidentStatusAction(incidentId, next)}
    />
  );
}
