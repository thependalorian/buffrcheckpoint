"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function requestNewGrantAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.post("/platform/support-access/grants", {
      organisationId: String(formData.get("organisationId")),
      reasonCode: String(formData.get("reasonCode")),
      note: String(formData.get("note") ?? "") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to request grant" };
  }
  revalidatePath("/support-access");
  return {};
}

export async function revokeGrantAction(grantId: string) {
  await api.delete(`/platform/support-access/grants/${grantId}`);
  revalidatePath("/support-access");
}

export interface MintSessionResult {
  accessToken: string;
  sessionId: string;
  organisationId: string;
  expiresAt: string;
}

export async function mintSessionAction(grantId: string): Promise<MintSessionResult> {
  return api.post<MintSessionResult>(`/platform/support-access/grants/${grantId}/session`);
}
