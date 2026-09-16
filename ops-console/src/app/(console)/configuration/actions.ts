"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function updateTemplateAction(formData: FormData): Promise<{ error?: string; message?: string }> {
  const templateId = String(formData.get("templateId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Body can't be empty" };
  try {
    await api.patch(`/platform/configuration/notification-templates/${templateId}`, {
      subject: String(formData.get("subject") ?? ""),
      body,
      note: String(formData.get("note") ?? "") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save template" };
  }
  revalidatePath("/configuration");
  return { message: "Template saved. New sends use this copy immediately." };
}

export async function updateHealthWeightsAction(formData: FormData): Promise<{ error?: string; message?: string }> {
  // Only send fields the operator actually changed — the backend merges onto
  // the current values, so an untouched field keeps its value rather than
  // being coerced to 0 by an empty input.
  const payload: Record<string, number | string> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "note") continue;
    const text = String(value).trim();
    if (!text) continue;
    const numeric = Number(text);
    if (Number.isNaN(numeric)) return { error: `${key} must be a number` };
    payload[key] = numeric;
  }
  const note = String(formData.get("note") ?? "").trim();
  if (note) payload.note = note;

  try {
    await api.patch("/platform/configuration/health-score-weights", payload);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save weights" };
  }
  revalidatePath("/configuration");
  revalidatePath("/analytics");
  return { message: "Weights saved. They apply at the next nightly health run." };
}
