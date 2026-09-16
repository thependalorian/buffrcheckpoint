"use client";

import { useActionState } from "react";

import { type OrgOption, OrgSelect } from "@/components/org-select";
import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusSelect } from "@/components/ui/status-select";

import { createDealAction, transitionDealAction } from "../actions";

const STAGES = ["prospecting", "discovery", "proposal", "negotiation", "won", "lost"];

export function CreateDealForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createDealAction(formData),
    {},
  );

  return (
    <CardForm action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input name="prospectName" placeholder="Prospect name" required />
        <OrgSelect name="organisationId" orgs={orgs} optionalLabel="Prospect only (no org yet)" />
        <NativeSelect name="stageCode" required defaultValue="prospecting">
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <Input name="expectedMrr" placeholder="Expected MRR (NAD)" inputMode="decimal" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Add deal"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </CardForm>
  );
}

export function DealStageControls({ dealId }: { dealId: string }) {
  return (
    <StatusSelect
      placeholder="Move to…"
      options={STAGES.map((s) => ({ value: s, label: s }))}
      onChange={(next) => transitionDealAction(dealId, next)}
    />
  );
}
