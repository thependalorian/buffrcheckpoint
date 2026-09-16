"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function submitPopAction(formData: FormData): Promise<{ error?: string }> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = String(formData.get("amount") ?? "");
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { error: "Choose a file first" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await api.post("/platform/billing/payments/pop", {
      invoiceId,
      amount,
      popDocumentBase64: buffer.toString("base64"),
      popDocumentName: file.name,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }

  revalidatePath("/dashboard/billing");
  return {};
}
