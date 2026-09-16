"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function reviewPaymentAction(paymentTransactionId: string, decision: "confirmed" | "rejected") {
  await api.patch(`/platform/billing/payments/${paymentTransactionId}/review`, { decision });
  revalidatePath("/billing");
}

export async function bulkReviewPaymentAction(
  paymentTransactionIds: string[],
  decision: "confirmed" | "rejected",
): Promise<{ requested: number; updated: number; failed: Array<{ id: string; reason: string }> } | { error: string }> {
  try {
    const result = await api.patch<{
      requested: number;
      updated: number;
      failed: Array<{ id: string; reason: string }>;
    }>("/platform/billing/payments/bulk-review", { paymentTransactionIds, decision });
    revalidatePath("/billing");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bulk payment review failed" };
  }
}
