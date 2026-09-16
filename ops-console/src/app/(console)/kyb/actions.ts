"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function decideKybAction(kybVerificationId: string, decision: "verified" | "rejected") {
  await api.patch(`/platform/kyb/submissions/${kybVerificationId}/decision`, { decision });
  revalidatePath("/kyb");
}

export async function bulkDecideKybAction(
  kybVerificationIds: string[],
  decision: "verified" | "rejected",
): Promise<{ requested: number; updated: number; failed: Array<{ id: string; reason: string }> } | { error: string }> {
  try {
    const result = await api.patch<{
      requested: number;
      updated: number;
      failed: Array<{ id: string; reason: string }>;
    }>("/platform/kyb/submissions/bulk-decision", { kybVerificationIds, decision });
    revalidatePath("/kyb");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bulk KYB decision failed" };
  }
}
