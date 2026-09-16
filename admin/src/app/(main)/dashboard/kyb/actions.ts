"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth/me";

export async function submitKybAction(formData: FormData): Promise<{ error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not signed in" };

  const businessRegistrationNumber = String(formData.get("businessRegistrationNumber") ?? "").trim();
  const registeredBusinessName = String(formData.get("registeredBusinessName") ?? "").trim();
  const registeredAddress = String(formData.get("registeredAddress") ?? "").trim();
  const authorizedSignatoryName = String(formData.get("authorizedSignatoryName") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!businessRegistrationNumber || !registeredBusinessName || !registeredAddress || !authorizedSignatoryName) {
    return { error: "All fields are required" };
  }

  let documentBase64: string | undefined;
  let documentName: string | undefined;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    documentBase64 = buffer.toString("base64");
    documentName = file.name;
  }

  try {
    await api.post("/platform/kyb/submissions", {
      organisationId: me.activeOrganisation.id,
      businessRegistrationNumber,
      registeredBusinessName,
      registeredAddress,
      authorizedSignatoryName,
      documentBase64,
      documentName,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Submission failed" };
  }

  revalidatePath("/dashboard/kyb");
  return {};
}
