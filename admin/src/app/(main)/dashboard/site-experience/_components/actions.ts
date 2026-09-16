"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

interface BrandingSetupInput {
  siteId?: string;
  profileName?: string;
  welcomeMessage?: string;
  brandColourToken?: string;
  logoArtifactId?: string;
  organisationDisplayName?: string;
  siteDisplayName?: string;
  helpContactReference?: string;
  captureChannelCodes?: string[];
  languageCodes?: string[];
}

interface KioskSetupInput {
  siteId: string;
  configName?: string;
  idleTimeoutSeconds?: number;
  idleWarningSeconds?: number;
  maintenanceModeEnabled?: boolean;
  maintenanceMessage?: string;
  captureChannelCodes?: string[];
}

interface QrSetupInput {
  siteId: string;
  qrTypeCode: string;
  label?: string;
}

interface EscalationSetupInput {
  siteId?: string;
  policyName?: string;
  visitorCategoryCode?: string;
  waitSeconds?: number;
  escalationActionCode?: string;
  alternateRecipientReference?: string;
}

export async function setupBrandingAndPublish(input: BrandingSetupInput) {
  const profile = await api.post<{ id: string }>("/site-branding", {
    siteId: input.siteId || undefined,
    profileName: input.profileName || "Site branding",
  });
  const version = await api.post<{ id: string }>(`/site-branding/${profile.id}/versions`, {
    welcomeMessage: input.welcomeMessage || "Welcome",
    brandColourToken: input.brandColourToken || "#1B4B91",
    logoArtifactId: input.logoArtifactId || "/logo.png",
    organisationDisplayName: input.organisationDisplayName,
    siteDisplayName: input.siteDisplayName,
    helpContactReference: input.helpContactReference,
    captureChannelCodes: input.captureChannelCodes ?? ["kiosk", "assisted", "qr"],
    languageCodes: input.languageCodes ?? ["en"],
  });
  await api.post(`/site-branding/${profile.id}/versions/${version.id}/publish`);
  revalidatePath("/dashboard/site-experience/branding");
}

export async function publishLatestBrandingVersion(profileId: string) {
  const versions = await api.get<Array<{ id: string; statusCode?: string }>>(`/site-branding/${profileId}/versions`);
  const draft = versions[0];
  if (!draft) throw new Error("No version to publish.");
  await api.post(`/site-branding/${profileId}/versions/${draft.id}/publish`);
  revalidatePath("/dashboard/site-experience/branding");
}

export async function setupKioskExperienceAndPublish(input: KioskSetupInput) {
  const config = await api.post<{ id: string }>("/kiosk-experience", {
    siteId: input.siteId,
    configName: input.configName || "Site default",
  });
  const version = await api.post<{ id: string }>(`/kiosk-experience/${config.id}/versions`, {
    idleTimeoutSeconds: input.idleTimeoutSeconds ?? 120,
    idleWarningSeconds: input.idleWarningSeconds ?? 30,
    maintenanceModeEnabled: input.maintenanceModeEnabled ?? false,
    maintenanceMessage: input.maintenanceMessage,
    captureChannelCodes: input.captureChannelCodes ?? ["kiosk", "assisted", "qr", "nfc_badge", "ussd"],
  });
  await api.post(`/kiosk-experience/${config.id}/versions/${version.id}/publish`);
  revalidatePath("/dashboard/site-experience/kiosk");
}

export async function publishLatestKioskVersion(configId: string) {
  const versions = await api.get<Array<{ id: string }>>(`/kiosk-experience/${configId}/versions`);
  const draft = versions[0];
  if (!draft) throw new Error("No version to publish.");
  await api.post(`/kiosk-experience/${configId}/versions/${draft.id}/publish`);
  revalidatePath("/dashboard/site-experience/kiosk");
}

export async function createQrReferenceAndRotate(input: QrSetupInput) {
  if (input.qrTypeCode !== "public_site_checkin") {
    throw new Error(
      `QR type "${input.qrTypeCode}" has no consuming journey yet. Issue public_site_checkin only.`,
    );
  }
  const reference = await api.post<{ id: string }>("/site-qr-references", input);
  await api.post(`/site-qr-references/${reference.id}/rotate`, {});
  revalidatePath("/dashboard/site-experience/qr");
}

export async function rotateQrReference(referenceId: string) {
  await api.post(`/site-qr-references/${referenceId}/rotate`, {});
  revalidatePath("/dashboard/site-experience/qr");
}

export async function setupEscalationAndPublish(input: EscalationSetupInput) {
  const policy = await api.post<{ id: string }>("/host-notification-escalation", {
    siteId: input.siteId,
    policyName: input.policyName || "Default escalation",
    visitorCategoryCode: input.visitorCategoryCode,
  });
  const version = await api.post<{ id: string }>(`/host-notification-escalation/${policy.id}/versions`, {
    waitSeconds: input.waitSeconds ?? 300,
    escalationActionCode: input.escalationActionCode || "notify_reception",
    alternateRecipientReference: input.alternateRecipientReference,
  });
  await api.post(`/host-notification-escalation/${policy.id}/versions/${version.id}/publish`);
  revalidatePath("/dashboard/site-experience/escalation");
}

export async function publishLatestEscalationVersion(policyId: string) {
  const versions = await api.get<Array<{ id: string }>>(`/host-notification-escalation/${policyId}/versions`);
  const draft = versions[0];
  if (!draft) throw new Error("No version to publish.");
  await api.post(`/host-notification-escalation/${policyId}/versions/${draft.id}/publish`);
  revalidatePath("/dashboard/site-experience/escalation");
}
