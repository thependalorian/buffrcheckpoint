"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

import { requestGrantAction } from "../actions";

const REASONS = [
  { value: "customer_reported_issue", label: "Customer-reported issue" },
  { value: "data_correction", label: "Data correction request" },
  { value: "billing_dispute", label: "Billing dispute investigation" },
  { value: "incident_response", label: "Incident response" },
  { value: "other", label: "Other" },
];

export function RequestGrantForm({ organisationId }: { organisationId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => requestGrantAction(formData),
    {},
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="organisationId" value={organisationId} />
      <NativeSelect name="reasonCode" className="text-xs" required>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Requesting…" : "Request access"}
      </Button>
      {state?.error ? <span className="text-destructive text-xs">{state.error}</span> : null}
    </form>
  );
}
