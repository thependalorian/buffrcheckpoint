"use client";

import { useActionState, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { approveGrantAction, denyGrantAction } from "../actions";

const REASON_LABELS: Record<string, string> = {
  customer_reported_issue: "Customer-reported issue",
  data_correction: "Data correction request",
  billing_dispute: "Billing dispute investigation",
  incident_response: "Incident response",
  other: "Other",
};

export interface PendingGrant {
  id: string;
  reasonLabel: string;
  requestedDurationMs: number;
}

export function PendingGrantCard({ grant }: { grant: PendingGrant }) {
  const [denyOpen, setDenyOpen] = useState(false);
  const [approving, startApprove] = useTransition();
  const [approveError, setApproveError] = useState<string | null>(null);
  const [denyState, denyAction, denying] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => denyGrantAction(formData),
    {},
  );

  const hours = Math.round(grant.requestedDurationMs / (60 * 60 * 1000));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="secondary">{REASON_LABELS[grant.reasonLabel] ?? grant.reasonLabel}</Badge>
          <p className="mt-2 text-muted-foreground text-sm">
            Buffr Checkpoint&apos;s internal support team is requesting time-boxed access to your organisation&apos;s
            account for support purposes — up to {hours} hours from approval, fully audited, never a standing
            credential.
          </p>
        </div>
      </div>

      {approveError ? <p className="mt-2 text-destructive text-xs">{approveError}</p> : null}

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          disabled={approving}
          onClick={() =>
            startApprove(async () => {
              const result = await approveGrantAction(grant.id);
              if (result.error) setApproveError(result.error);
            })
          }
        >
          {approving ? "Approving…" : "Approve access"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDenyOpen(true)}>
          Deny
        </Button>
      </div>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny support-access request</DialogTitle>
          </DialogHeader>
          <form action={denyAction} className="space-y-3">
            <input type="hidden" name="grantId" value={grant.id} />
            <Textarea name="reason" placeholder="Reason (optional, shared with Buffr Checkpoint support)" rows={3} />
            {denyState?.error ? <p className="text-destructive text-xs">{denyState.error}</p> : null}
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={denying} onClick={() => setDenyOpen(false)}>
                {denying ? "Denying…" : "Deny request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
