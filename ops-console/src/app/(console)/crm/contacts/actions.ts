"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function updateContactAction(
  contactId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await api.patch(`/platform/crm/contacts/${contactId}`, {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      roleTitle: String(formData.get("roleTitle") ?? "").trim() || null,
      isPrimary: formData.get("isPrimary") === "on",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update contact" };
  }
  revalidatePath(`/crm/contacts/${contactId}`);
  revalidatePath("/organisations");
  return {};
}
