"use client";

import { useActionState } from "react";

import { type OrgOption, OrgSelect } from "@/components/org-select";
import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { requestNewGrantAction } from "../actions";

const REASONS = [
  { value: "customer_reported_issue", label: "Customer-reported issue" },
  { value: "data_correction", label: "Data correction request" },
  { value: "billing_dispute", label: "Billing dispute investigation" },
  { value: "incident_response", label: "Incident response" },
  { value: "other", label: "Other" },
];

export function NewGrantForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => requestNewGrantAction(formData),
    {},
  );

  return (
    <CardForm action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <div className="space-y-1">
        <label htmlFor="organisationId" className="text-muted-foreground text-xs">
          Organisation
        </label>
        <OrgSelect
          id="organisationId"
          name="organisationId"
          orgs={orgs}
          allowEmpty={false}
          required
          className="w-full min-w-48"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="reasonCode" className="text-muted-foreground text-xs">
          Reason
        </label>
        <NativeSelect id="reasonCode" name="reasonCode" required className="w-full">
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
        <label htmlFor="note" className="text-muted-foreground text-xs">
          Note to customer
        </label>
        <Input id="note" name="note" className="w-full" placeholder="Included in the approval email" />
      </div>
      <Button type="submit" disabled={pending || orgs.length === 0}>
        {pending ? "Requesting…" : "Request grant"}
      </Button>
      {state?.error ? <span className="text-destructive text-xs sm:col-span-2">{state.error}</span> : null}
    </CardForm>
  );
}
