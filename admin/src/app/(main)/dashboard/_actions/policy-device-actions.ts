"use server";

import { revalidatePath } from "next/cache";

import { failure, runAction } from "@/lib/actions/result";
import { api } from "@/lib/api/client";
import { optional } from "@/lib/forms/values";

export async function createFormDefinitionAction(input: {
  visitorCategoryCode: string;
  formName: string;
  siteId?: string;
}) {
  return runAction("Could not create the form.", async () => {
    const created = await api.post<{ id: string }>("/visitor-policy/forms", {
      visitorCategoryCode: input.visitorCategoryCode,
      formName: input.formName,
      siteId: optional(input.siteId),
    });
    const version = await api.post<{ id: string }>(`/visitor-policy/forms/${created.id}/versions`);
    revalidatePath("/dashboard/policies/forms");
    revalidatePath(`/dashboard/policies/forms/${created.id}`);
    return { ...created, draftVersionId: version.id };
  });
}

export async function createAccessPolicyAction(input: { siteId?: string; configJson: string }) {
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(optional(input.configJson) ?? "{}") as Record<string, unknown>;
  } catch {
    return failure("INVALID_CONFIG", "Config must be valid JSON");
  }
  return runAction("Could not create the access policy.", async () => {
    await api.post("/access-policies", { siteId: optional(input.siteId), config });
    revalidatePath("/dashboard/policies/access");
  });
}

export async function createRetentionPolicyAction(input: { siteId?: string; retentionDays: number }) {
  return runAction("Could not create the retention policy.", async () => {
    await api.post("/retention-policy", {
      siteId: optional(input.siteId),
      retentionDays: input.retentionDays,
    });
    revalidatePath("/dashboard/policies/retention");
  });
}

export async function createPrivacyDocumentAction(input: {
  policyCode: string;
  policyName: string;
  contentText: string;
  languageCode: string;
}) {
  return runAction("Could not publish the privacy notice.", async () => {
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
  });
}

export async function createDeviceAction(input: {
  siteId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
}) {
  return runAction("Could not register the device.", async () => {
    await api.post("/devices", input);
    revalidatePath("/dashboard/devices");
  });
}

export async function activateDeviceAction(deviceId: string) {
  return runAction("Could not activate the device.", async () => {
    await api.post(`/devices/${deviceId}/activate`);
    revalidatePath("/dashboard/devices");
  });
}

export async function issueCredentialAction(input: {
  holderTypeCode: string;
  holderId: string;
  credentialTypeCode: string;
  expiresAt?: string;
}) {
  return runAction("Could not issue the credential.", async () => {
    const created = await api.post<{
      id: string;
      credentialReferenceHmac: string;
    }>("/credentials", {
      holderTypeCode: input.holderTypeCode,
      holderId: input.holderId,
      credentialTypeCode: input.credentialTypeCode,
      expiresAt: optional(input.expiresAt),
    });
    revalidatePath("/dashboard/credentials");
    return created;
  });
}

export async function revokeCredentialAction(credentialId: string, reason: string) {
  return runAction("Could not revoke the credential.", async () => {
    await api.post(`/credentials/${credentialId}/revoke`, { reason });
    revalidatePath("/dashboard/credentials");
  });
}

export async function validateCredentialAction(credentialReferenceHmac: string) {
  return runAction("Could not validate the credential.", async () => {
    return api.post<{
      valid: boolean;
      reason?: string;
      credentialId?: string;
    }>("/credentials/validate", { credentialReferenceHmac });
  });
}

export async function retireDeviceAction(deviceId: string, reason: string) {
  return runAction("Could not retire the device.", async () => {
    await api.delete(`/devices/${deviceId}`, { reason });
    revalidatePath("/dashboard/devices");
  });
}

export async function setDeviceStatusAction(deviceId: string, statusCode: string, reason: string) {
  return runAction("Could not change the device status.", async () => {
    await api.post(`/devices/${deviceId}/status`, { statusCode, reason });
    revalidatePath("/dashboard/devices");
  });
}

export async function inviteUserAction(input: { email: string; password: string; roleCode: string; siteId?: string }) {
  return runAction("Could not invite the user.", async () => {
    await api.post("/auth/register", {
      email: input.email,
      password: input.password,
      roleCode: input.roleCode,
      siteId: optional(input.siteId),
    });
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/roles");
  });
}

export async function changeUserRoleAction(input: {
  userId: string;
  newRoleCode: string;
  reason: string;
  siteId?: string;
}) {
  return runAction("Could not change the role.", async () => {
    await api.post("/rbac/role-assignments/change", {
      userId: input.userId,
      newRoleCode: input.newRoleCode,
      reason: input.reason,
      siteId: optional(input.siteId),
    });
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/roles");
  });
}
