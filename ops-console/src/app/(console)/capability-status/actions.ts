"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function updateCapabilityStatusAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.patch("/capability-status", {
      capabilityCode: String(formData.get("capabilityCode")),
      status: String(formData.get("status")),
      publicStatus: String(formData.get("publicStatus")),
      evidenceReference: String(formData.get("evidenceReference")),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed" };
  }
  revalidatePath("/capability-status");
  return {};
}
