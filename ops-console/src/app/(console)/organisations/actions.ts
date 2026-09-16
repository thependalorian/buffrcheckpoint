"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function requestGrantAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.post("/platform/support-access/grants", {
      organisationId: String(formData.get("organisationId")),
      reasonCode: String(formData.get("reasonCode")),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to request grant" };
  }
  revalidatePath("/support-access");
  return {};
}
