"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { reviewPaymentAction } from "../actions";

export function ReviewButtons({ paymentTransactionId }: { paymentTransactionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => reviewPaymentAction(paymentTransactionId, "confirmed"))}
      >
        Confirm
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => startTransition(() => reviewPaymentAction(paymentTransactionId, "rejected"))}
      >
        Reject
      </Button>
    </div>
  );
}
