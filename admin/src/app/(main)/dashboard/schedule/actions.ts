"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createInvitationAction(input: {
  siteId: string;
  hostId: string;
  visitorReference: string;
  visitorCategoryCode?: string;
  expiresAt: string;
  visitorEmail?: string;
  visitorMobile?: string;
}) {
  const siteId = input.siteId.trim();
  const hostId = input.hostId.trim();
  const visitorReference = input.visitorReference.trim();
  if (!siteId) throw new Error("Site is required.");
  if (!hostId) throw new Error("Host is required.");
  if (visitorReference.length < 2) throw new Error("Visitor reference is required.");
  if (!input.expiresAt) throw new Error("Expiry date is required.");

  const expiresAt = input.expiresAt.includes("T") ? new Date(input.expiresAt).toISOString() : input.expiresAt;

  const visitorEmail = input.visitorEmail?.trim();
  const visitorMobile = input.visitorMobile?.trim();
  const created = await api.post<{ qrUrl: string; id: string; emailed?: boolean; texted?: boolean }>("/invitations", {
    siteId,
    hostId,
    visitorReference,
    visitorCategoryCode: input.visitorCategoryCode?.trim() || "general",
    expiresAt,
    ...(visitorEmail ? { visitorEmail } : {}),
    ...(visitorMobile ? { visitorMobile } : {}),
  });

  revalidatePath("/dashboard/schedule");
  return created;
}

export async function revokeInvitationAction(invitationId: string) {
  await api.post(`/invitations/${invitationId}/revoke`, { reason: "revoked_from_admin" });
  revalidatePath("/dashboard/schedule");
  return { revoked: true };
}
