"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function recordAccessReviewAction(input: {
  reviewedUserId: string;
  outcomeCode: string;
  note?: string;
}) {
  try {
    await api.post("/access-reviews", input);
    revalidatePath("/dashboard/roles");
    return { ok: true as const };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not record attestation." };
  }
}
