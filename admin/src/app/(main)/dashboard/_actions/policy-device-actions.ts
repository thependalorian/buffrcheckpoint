"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function createFormDefinitionAction(input: {
  visitorCategoryCode: string;
  formName: string;
  siteId?: string;
}) {
  const created = await api.post<{ id: string }>("/visitor-policy/forms", {
    visitorCategoryCode: input.visitorCategoryCode,
    formName: input.formName,
    siteId: input.siteId || undefined,
  });
  const version = await api.post<{ id: string }>(`/visitor-policy/forms/${created.id}/versions`);
  revalidatePath("/dashboard/policies/forms");
  revalidatePath(`/dashboard/policies/forms/${created.id}`);
  return { ...created, draftVersionId: version.id };
}

export async function createAccessPolicyAction(input: { siteId?: string; configJson: string }) {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(input.configJson || "{}") as Record<string, unknown>;
  } catch {
    throw new Error("Config must be valid JSON");
  }
  await api.post("/access-policies", { siteId: input.siteId || undefined, config });
  revalidatePath("/dashboard/policies/access");
}

export async function createRetentionPolicyAction(input: { siteId?: string; retentionDays: number }) {
  await api.post("/retention-policy", {
    siteId: input.siteId || undefined,
    retentionDays: input.retentionDays,
  });
  revalidatePath("/dashboard/policies/retention");
}

export async function createPrivacyDocumentAction(input: {
  policyCode: string;
  policyName: string;
  contentText: string;
  languageCode: string;
}) {
  const doc = await api.post<{ id: string }>("/visitor-policy/documents", {
    policyCode: input.policyCode,
    policyName: input.policyName,
    category: "privacy_notice",
  });
  const version = await api.post<{ id: string }>(`/visitor-policy/documents/${doc.id}/versions`, {
    contentText: input.contentText,
    languageCode: input.languageCode,
  });
  await api.post(`/visitor-policy/versions/${version.id}/publish`);
  revalidatePath("/dashboard/policies/retention");
  return doc;
}

export async function createDeviceAction(input: {
  siteId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
}) {
  await api.post("/devices", input);
  revalidatePath("/dashboard/devices");
}

export async function activateDeviceAction(deviceId: string) {
  await api.post(`/devices/${deviceId}/activate`);
  revalidatePath("/dashboard/devices");
}

export async function issueCredentialAction(input: {
  holderTypeCode: string;
  holderId: string;
  credentialTypeCode: string;
  expiresAt?: string;
}) {
  const created = await api.post<{
    id: string;
    credentialReferenceHmac: string;
  }>("/credentials", {
    holderTypeCode: input.holderTypeCode,
    holderId: input.holderId,
    credentialTypeCode: input.credentialTypeCode,
    expiresAt: input.expiresAt || undefined,
  });
  revalidatePath("/dashboard/credentials");
  return created;
}

export async function revokeCredentialAction(credentialId: string, reason: string) {
  await api.post(`/credentials/${credentialId}/revoke`, { reason });
  revalidatePath("/dashboard/credentials");
}

export async function validateCredentialAction(credentialReferenceHmac: string) {
  return api.post<{
    valid: boolean;
    reason?: string;
    credentialId?: string;
  }>("/credentials/validate", { credentialReferenceHmac });
}

export async function retireDeviceAction(deviceId: string, reason: string) {
  await api.delete(`/devices/${deviceId}`, { reason });
  revalidatePath("/dashboard/devices");
}

export async function setDeviceStatusAction(deviceId: string, statusCode: string, reason: string) {
  await api.post(`/devices/${deviceId}/status`, { statusCode, reason });
  revalidatePath("/dashboard/devices");
}

export async function inviteUserAction(input: {
  email: string;
  password: string;
  roleCode: string;
  siteId?: string;
}) {
  await api.post("/auth/register", {
    email: input.email,
    password: input.password,
    roleCode: input.roleCode,
    siteId: input.siteId || undefined,
  });
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/roles");
}

export async function changeUserRoleAction(input: {
  userId: string;
  newRoleCode: string;
  reason: string;
  siteId?: string;
}) {
  await api.post("/rbac/role-assignments/change", {
    userId: input.userId,
    newRoleCode: input.newRoleCode,
    reason: input.reason,
    siteId: input.siteId || undefined,
  });
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/roles");
}
