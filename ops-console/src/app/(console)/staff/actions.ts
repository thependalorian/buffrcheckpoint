"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function inviteStaffAction(formData: FormData): Promise<{ error?: string; message?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required" };
  try {
    await api.post("/platform/staff/invitations", { email, roleCode: String(formData.get("roleCode") ?? "") });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to invite staff member" };
  }
  revalidatePath("/staff");
  return { message: `Invitation sent to ${email}. The link expires in one hour.` };
}

export async function resendInvitationAction(userId: string) {
  await api.post(`/platform/staff/${userId}/invitations`);
  revalidatePath("/staff");
}

export async function setStaffRoleAction(userId: string, roleCode: string) {
  await api.patch(`/platform/staff/${userId}/role`, { roleCode });
  revalidatePath("/staff");
}

export async function deactivateStaffAction(userId: string) {
  await api.delete(`/platform/staff/${userId}`);
  revalidatePath("/staff");
}
