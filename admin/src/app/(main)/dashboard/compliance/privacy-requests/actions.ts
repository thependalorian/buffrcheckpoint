"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createDsarAction(input: { subjectReference: string; requestTypeCode: string }) {
  await api.post("/dsar", input);
  revalidatePath("/dashboard/compliance/privacy-requests");
}

export async function resolveDsarAction(input: {
  id: string;
  resolution: "completed" | "rejected";
  reason: string;
}) {
  await api.post(`/dsar/${input.id}/resolve`, {
    resolution: input.resolution,
    reason: input.reason,
  });
  revalidatePath("/dashboard/compliance/privacy-requests");
  revalidatePath("/dashboard/compliance");
}
