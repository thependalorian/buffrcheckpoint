"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function createTicketAction(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.post("/platform/tickets", {
      subject: String(formData.get("subject")),
      description: String(formData.get("description") ?? ""),
      severityCode: String(formData.get("severityCode")),
      organisationId: String(formData.get("organisationId") ?? "") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create ticket" };
  }
  revalidatePath("/tickets");
  return {};
}

export async function updateTicketStatusAction(ticketId: string, statusCode: string) {
  await api.patch(`/platform/tickets/${ticketId}/status`, { statusCode });
  revalidatePath("/tickets");
}

export async function addCommentAction(formData: FormData): Promise<{ error?: string }> {
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Comment can't be empty" };
  try {
    await api.post(`/platform/tickets/${ticketId}/comments`, { body });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add comment" };
  }
  revalidatePath(`/tickets/${ticketId}`);
  return {};
}
