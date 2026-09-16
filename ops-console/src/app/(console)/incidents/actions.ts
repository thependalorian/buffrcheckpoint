"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function createIncidentAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.post("/platform/incidents", {
      title: String(formData.get("title")),
      description: String(formData.get("description") ?? ""),
      severityCode: String(formData.get("severityCode")),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create incident" };
  }
  revalidatePath("/incidents");
  return {};
}

export async function updateIncidentStatusAction(incidentId: string, statusCode: string) {
  await api.patch("/platform/incidents/status", { incidentId, statusCode });
  revalidatePath("/incidents");
}
