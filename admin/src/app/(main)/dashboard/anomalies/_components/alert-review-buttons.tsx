"use client";

import { useTransition } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { anomaliesCopy } from "@/lib/copy/anomalies";

import { reviewAnomalyAlertAction } from "../actions";

export function AlertReviewButtons({ alertId, state }: { alertId: string; state: string }) {
  const [pending, startTransition] = useTransition();

  function review(status: "acknowledged" | "dismissed" | "reopened") {
    startTransition(async () => {
      const result = await reviewAnomalyAlertAction(alertId, status);
      if (result.error) toast.error(result.error);
      else toast.success(anomaliesCopy.reviewed);
    });
  }

  if (state !== "open") {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => review("reopened")}>
        {anomaliesCopy.actions.reopen}
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => review("acknowledged")}>
        {anomaliesCopy.actions.acknowledge}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => review("dismissed")}>
        {anomaliesCopy.actions.dismiss}
      </Button>
    </div>
  );
}
