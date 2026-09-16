"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createLegalHoldAction(input: {
  reason: string;
  scopeJson: string;
}) {
  let scope: Record<string, unknown> = {};
  try {
    scope = JSON.parse(input.scopeJson || "{}") as Record<string, unknown>;
  } catch {
    throw new Error("Scope must be valid JSON");
  }
  await api.post("/legal-holds", { reason: input.reason, scope });
  revalidatePath("/dashboard/compliance/legal-holds");
}

export async function releaseLegalHoldAction(input: { id: string; reason: string }) {
  await api.post(`/legal-holds/${input.id}/release`, { reason: input.reason });
  revalidatePath("/dashboard/compliance/legal-holds");
}
