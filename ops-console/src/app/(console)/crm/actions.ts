"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function createDealAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.post("/platform/crm/deals", {
      organisationId: String(formData.get("organisationId") ?? "") || undefined,
      prospectName: String(formData.get("prospectName") ?? "") || undefined,
      stageCode: String(formData.get("stageCode")),
      expectedMrr: String(formData.get("expectedMrr") ?? "") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create deal" };
  }
  revalidatePath("/crm");
  return {};
}

export async function transitionDealAction(dealId: string, stageCode: string) {
  await api.patch(`/platform/crm/deals/${dealId}/stage`, { stageCode });
  revalidatePath("/crm");
}
