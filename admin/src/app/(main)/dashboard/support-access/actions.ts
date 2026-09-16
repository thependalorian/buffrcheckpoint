"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function approveGrantAction(grantId: string): Promise<{ error?: string }> {
  try {
    await api.patch(`/platform/support-access/grants/${grantId}/approve`, {});
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve" };
  }
  revalidatePath("/dashboard/support-access");
  return {};
}

export async function denyGrantAction(formData: FormData): Promise<{ error?: string }> {
  const grantId = String(formData.get("grantId"));
  const reason = String(formData.get("reason") ?? "");
  try {
    await api.patch(`/platform/support-access/grants/${grantId}/deny`, { reason });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to deny" };
  }
  revalidatePath("/dashboard/support-access");
  return {};
}
