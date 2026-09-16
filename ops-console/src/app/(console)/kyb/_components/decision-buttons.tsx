"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { decideKybAction } from "../actions";

export function DecisionButtons({ kybVerificationId }: { kybVerificationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => decideKybAction(kybVerificationId, "verified"))}
      >
        Verify
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => startTransition(() => decideKybAction(kybVerificationId, "rejected"))}
      >
        Reject
      </Button>
    </div>
  );
}
