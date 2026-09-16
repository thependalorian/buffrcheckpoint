"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateHealthWeightsAction, updateTemplateAction } from "../actions";

export interface TemplateRow {
  id: string;
  templateCode: string;
  templateLabel: string;
  subject: string | null;
  body: string;
  updatedAt: string | null;
}

export function TemplateForm({ template }: { template: TemplateRow }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; message?: string }, formData: FormData) => updateTemplateAction(formData),
    {},
  );

  return (
    <CardForm action={formAction} className="space-y-3">
      <input type="hidden" name="templateId" value={template.id} />
      <div>
        <p className="font-medium text-foreground text-sm">{template.templateLabel}</p>
        <p className="text-muted-foreground text-xs">
          {template.templateCode}
          {template.updatedAt ? ` · last edited ${new Date(template.updatedAt).toLocaleString()}` : ""}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`subject-${template.id}`}>Subject</Label>
        <Input
          id={`subject-${template.id}`}
          name="subject"
          defaultValue={template.subject ?? ""}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`body-${template.id}`}>Body</Label>
        <Textarea id={`body-${template.id}`} name="body" defaultValue={template.body} rows={6} />
      </div>
      <Input name="note" placeholder="Why this change (recorded in the change log)" className="w-full" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save template"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
      {state?.message ? <p className="text-muted-foreground text-xs">{state.message}</p> : null}
    </CardForm>
  );
}

export interface WeightsPayload {
  weights: Record<string, number>;
  bounds: Record<string, [number, number]>;
  updatedAt: string | null;
  seeded: boolean;
}

// Field order follows the scorecard's own reading order in
// organisation-health.service.ts: base, then each signal's contribution, then
// the band cutoffs.
const WEIGHT_LABELS: Record<string, string> = {
  baseScore: "Starting score",
  visitVolumeTrendWeight: "Visit-volume trend multiplier",
  visitVolumeTrendFloor: "Visit-volume trend floor (worst case)",
  visitVolumeTrendCeiling: "Visit-volume trend ceiling (best case)",
  adminLoginRecencyPerDay: "Points lost per day since last admin login",
  adminLoginRecencyCap: "Maximum login-recency penalty",
  notificationFailureWeight: "Notification-failure penalty multiplier",
  deviceOfflineWeight: "Device-offline penalty multiplier",
  lowRiskBandFloor: "Low-risk band floor",
  mediumRiskBandFloor: "Medium-risk band floor",
};

export function HealthWeightsForm({ payload }: { payload: WeightsPayload }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; message?: string }, formData: FormData) => updateHealthWeightsAction(formData),
    {},
  );

  return (
    <CardForm action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.keys(WEIGHT_LABELS).map((key) => {
          const bound = payload.bounds[key];
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={`weight-${key}`}>{WEIGHT_LABELS[key]}</Label>
              <Input
                id={`weight-${key}`}
                name={key}
                type="number"
                step="1"
                min={bound?.[0]}
                max={bound?.[1]}
                defaultValue={payload.weights[key]}
                className="w-full"
              />
              {bound ? (
                <p className="text-muted-foreground text-xs">
                  Allowed {bound[0]} to {bound[1]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <Input name="note" placeholder="Why this change (recorded in the change log)" className="w-full" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save weights"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
      {state?.message ? <p className="text-muted-foreground text-xs">{state.message}</p> : null}
    </CardForm>
  );
}
