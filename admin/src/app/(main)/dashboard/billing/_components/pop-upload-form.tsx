"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { submitPopAction } from "../actions";

// Manual EFT + Proof of Payment — the only billing action a customer takes
// themselves (backend/src/modules/billing/billing.service.ts
// submitProofOfPayment). Platform Ops Console reviews/confirms it from
// there; this form only uploads.
export function PopUploadForm({ invoiceId, amount }: { invoiceId: string; amount: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => submitPopAction(formData),
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="amount" value={amount} />
      <Input type="file" name="file" accept="application/pdf,image/*" required className="max-w-xs" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading…" : "Upload proof of payment"}
      </Button>
      {state?.error ? <p className="text-destructive text-xs">{state.error}</p> : null}
    </form>
  );
}
