"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

function message(err: unknown): string {
  const text = err instanceof Error ? err.message : "Request failed";
  const start = text.indexOf("{");
  if (start >= 0) {
    try {
      const body = JSON.parse(text.slice(start)) as { message?: string | string[] };
      return Array.isArray(body.message) ? body.message.join(" ") : (body.message ?? text);
    } catch {
      /* plain text */
    }
  }
  return text.replace(/^API error \d+:\s*/, "");
}

export async function decideKybAction(
  kybVerificationId: string,
  decision: "verified" | "rejected" | "needs_info",
  note?: string,
  flaggedFields?: string[],
  registryChecked?: boolean,
): Promise<{ error?: string }> {
  try {
    await api.patch(`/platform/kyb/submissions/${kybVerificationId}/decision`, {
      decision,
      note,
      flaggedFields,
      registryChecked,
    });
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath("/kyb");
  revalidatePath(`/kyb/${kybVerificationId}`);
  return {};
}

export async function decideKybDocumentAction(
  kybVerificationId: string,
  documentId: string,
  decision: "accepted" | "rejected",
  note?: string,
): Promise<{ error?: string }> {
  try {
    await api.patch(`/platform/kyb/documents/${documentId}/decision`, { decision, note });
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/kyb/${kybVerificationId}`);
  return {};
}

export async function bulkDecideKybAction(
  kybVerificationIds: string[],
  decision: "rejected",
): Promise<{ requested: number; updated: number; failed: Array<{ id: string; reason: string }> } | { error: string }> {
  try {
    const result = await api.patch<{
      requested: number;
      updated: number;
      failed: Array<{ id: string; reason: string }>;
    }>("/platform/kyb/submissions/bulk-decision", {
      kybVerificationIds,
      decision,
      note: "Please correct the details and resubmit.",
    });
    revalidatePath("/kyb");
    return result;
  } catch (err) {
    return { error: message(err) };
  }
}
