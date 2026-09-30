"use server";

import { api } from "@/lib/api/client";

export async function generateEvidencePack(range?: { from?: string; to?: string }): Promise<void> {
  const qs = new URLSearchParams({
    ...(range?.from ? { from: range.from } : {}),
    ...(range?.to ? { to: range.to } : {}),
  });
  await api.post(`/evidence/generate${qs.toString() ? `?${qs}` : ""}`);
}
