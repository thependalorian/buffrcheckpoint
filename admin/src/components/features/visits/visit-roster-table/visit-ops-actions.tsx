"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { approveVisitAction, checkoutVisitAction, rejectVisitAction } from "@/app/(main)/dashboard/_actions/visit-ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsEvents, track } from "@/lib/observability/track";

export function VisitOpsActions({
  visitId,
  visitStatusCode,
}: {
  visitId: string;
  visitStatusCode: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pendingApproval = visitStatusCode === "pending_approval";
  const open = visitStatusCode === "checked_in" || pendingApproval;

  function run(action: () => Promise<void>, eventName?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        if (eventName) track(eventName, { from_status: visitStatusCode });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="flex min-w-48 flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {pendingApproval ? (
          <>
            <Button size="sm" disabled={pending} onClick={() => run(() => approveVisitAction(visitId))}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || rejectReason.trim().length < 2}
              onClick={() => run(() => rejectVisitAction(visitId, rejectReason.trim()))}
            >
              Reject
            </Button>
          </>
        ) : null}
        {open ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => checkoutVisitAction(visitId), AnalyticsEvents.frontDeskCheckout)}
          >
            Check out
          </Button>
        ) : null}
      </div>
      {pendingApproval ? (
        <Input
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="Reject reason"
          className="h-8 text-xs"
        />
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
