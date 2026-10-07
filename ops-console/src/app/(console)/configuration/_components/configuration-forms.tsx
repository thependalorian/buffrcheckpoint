"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { CardForm } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { testTemplateAction, updateHealthWeightsAction, updateTemplateAction } from "../actions";
import type { TemplateRow } from "./template-groups";

const TEMPLATE_TOKENS: Record<string, string[]> = {
  email_verification: ["verifyUrl"],
  password_reset: ["resetUrl"],
  account_lockout: ["lockoutMinutes", "forgotPasswordUrl", "lockedAtUtc"],
  mfa_enabled: ["email"],
  password_changed: ["email", "forgotPasswordUrl"],
  org_welcome: ["organisationName", "adminEmail", "adminUrl"],
  platform_staff_invitation: ["resetUrl"],
  support_access_request: ["organisationName"],
  ops_new_organisation: ["organisationName", "organisationId", "adminEmail", "sectorCode", "adminUrl", "opsOrgUrl"],
  ops_contact_enquiry: ["name", "email", "company", "message"],
  ops_contact_ack: ["name", "signupUrl"],
  invoice_issued: ["invoiceNumber", "organisationName", "amount", "currencyCode", "dueAt", "invoiceUrl"],
  invoice_reminder: ["invoiceNumber", "organisationName", "amount", "currencyCode", "dueAt", "invoiceUrl"],
  pop_received_ack: ["invoiceNumber", "amount", "currencyCode"],
  pop_received_ops: [
    "invoiceNumber",
    "organisationName",
    "amount",
    "currencyCode",
    "submittedByEmail",
    "opsBillingUrl",
  ],
  pop_rejected: ["invoiceNumber", "note", "invoiceUrl"],
  payment_confirmed: ["invoiceNumber", "amount", "currencyCode"],
  receipt_issued: ["invoiceNumber", "amount", "currencyCode", "receiptUrl"],
  subscription_activated: ["organisationName", "statusCode", "adminUrl"],
  suspension_warning: ["organisationName", "billingUrl"],
  kyb_submitted_ack: ["organisationName"],
  kyb_verified: ["organisationName"],
  kyb_rejected: ["organisationName", "note"],
  host_visitor_arrived: ["visitorName", "siteLabel", "detailBlock"],
  host_escalation: ["actionCode", "visitId", "siteLabel", "visitorName"],
  support_ticket_ack: ["ticketId", "subject"],
  visitor_prereg_invite: ["siteName", "hostName", "expectedAt", "validUntil", "checkInUrl"],
  visitor_visit_receipt: ["siteName", "hostName", "checkedInAt", "visitReference", "signOutUrl"],
  visitor_signout_thanks: ["siteName", "checkedInAt", "checkedOutAt", "duration", "ratingUrl"],
  credit_note_issued: [
    "creditNoteNumber",
    "invoiceNumber",
    "amount",
    "currencyCode",
    "balanceAfter",
    "reason",
    "invoiceUrl",
  ],
  support_ticket_reply: ["ticketId", "subject", "reply"],
  scheduled_ops_daily_summary: ["period"],
  scheduled_site_manager_digest: ["organisationName", "from", "to"],
  scheduled_board_compliance_monthly: ["organisationName", "from", "to", "period"],
};

export function TemplateForm({ template }: { template: TemplateRow }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; message?: string }, formData: FormData) => updateTemplateAction(formData),
    {},
  );
  const [testState, testAction, testPending] = useActionState(
    async (_prev: { error?: string; message?: string }, formData: FormData) => testTemplateAction(formData),
    {},
  );
  const tokens = TEMPLATE_TOKENS[template.templateCode] ?? [];

  return (
    <CardForm action={formAction} className="space-y-3">
      <input type="hidden" name="templateId" value={template.id} />
      <div>
        <p className="font-medium text-foreground text-sm">{template.templateLabel}</p>
        <p className="text-muted-foreground text-xs">
          {template.templateCode}
          {template.updatedAt ? ` · last edited ${new Date(template.updatedAt).toLocaleString()}` : ""}
        </p>
        {tokens.length > 0 ? (
          <p className="mt-1 text-muted-foreground text-xs">Tokens: {tokens.map((t) => `{{${t}}}`).join(" · ")}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`subject-${template.id}`}>Subject</Label>
        <Input id={`subject-${template.id}`} name="subject" defaultValue={template.subject ?? ""} className="w-full" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`body-${template.id}`}>Body</Label>
        <Textarea id={`body-${template.id}`} name="body" defaultValue={template.body} rows={6} />
      </div>
      <Input name="note" placeholder="Why this change (recorded in the change log)" className="w-full" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
        </Button>
        <Button type="submit" size="sm" variant="outline" disabled={testPending} formAction={testAction}>
          {testPending ? "Sending…" : "Send test to ops inbox"}
        </Button>
      </div>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
      {state?.message ? <p className="text-muted-foreground text-xs">{state.message}</p> : null}
      {testState?.error ? <p className="text-destructive text-xs">{testState.error}</p> : null}
      {testState?.message ? <p className="text-muted-foreground text-xs">{testState.message}</p> : null}
    </CardForm>
  );
}

export interface WeightsPayload {
  weights: Record<string, number>;
  bounds: Record<string, [number, number]>;
  updatedAt: string | null;
  seeded: boolean;
}

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
