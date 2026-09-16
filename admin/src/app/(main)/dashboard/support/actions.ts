"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createTicketAction(formData: FormData): Promise<{ error?: string }> {
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const severityCode = String(formData.get("severityCode") ?? "");

  if (!subject || !severityCode) {
    return { error: "Subject and severity are required" };
  }

  try {
    await api.post("/tickets", { subject, description: description || undefined, severityCode });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to open ticket" };
  }

  revalidatePath("/dashboard/support");
  return {};
}

export async function replyToTicketAction(formData: FormData): Promise<{ error?: string }> {
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Reply can't be empty" };

  try {
    await api.post(`/tickets/${ticketId}/comments`, { body });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to send reply" };
  }

  revalidatePath(`/dashboard/support/${ticketId}`);
  return {};
}
