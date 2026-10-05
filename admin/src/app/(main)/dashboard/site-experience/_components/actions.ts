"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, failure, runAction } from "@/lib/actions/result";
import { api } from "@/lib/api/client";
import { optional } from "@/lib/forms/values";

interface BrandingSetupInput {
  siteId?: string;
  profileName?: string;
  welcomeMessage?: string;
  brandColourToken?: string;
  /** Reference returned by POST /api/branding/logo; never a data URL. */
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

/** Profile, version and publish happen in one backend transaction (POST /site-branding/setup). */
export async function setupBrandingAndPublish(input: BrandingSetupInput): Promise<ActionResult<{ profileId: string }>> {
  return runAction("Could not save branding.", async () => {
    const result = await api.post<{ profileId: string }>("/site-branding/setup", {
      siteId: optional(input.siteId),
      profileName: optional(input.profileName) ?? "Site branding",
      welcomeMessage: optional(input.welcomeMessage) ?? "Welcome",
      brandColourToken: optional(input.brandColourToken),
      logoArtifactId: optional(input.logoArtifactId),
      organisationDisplayName: optional(input.organisationDisplayName),
      siteDisplayName: optional(input.siteDisplayName),
      helpContactReference: optional(input.helpContactReference),
      captureChannelCodes: input.captureChannelCodes ?? ["kiosk", "assisted", "qr"],
      languageCodes: input.languageCodes ?? ["en"],
    });
    revalidatePath("/dashboard/site-experience/branding");
    revalidatePath("/onboarding");
    return { profileId: result.profileId };
  });
}

export async function publishLatestBrandingVersion(profileId: string): Promise<ActionResult> {
  const versions = await runAction("Could not load branding versions.", () =>
    api.get<Array<{ id: string }>>(`/site-branding/${profileId}/versions`),
  );
  if (!versions.ok) return versions;
  const draft = versions.data[0];
  if (!draft) return failure("NO_VERSION", "No version to publish.");
  return runAction("Could not publish branding.", async () => {
    await api.post(`/site-branding/${profileId}/versions/${draft.id}/publish`);
    revalidatePath("/dashboard/site-experience/branding");
  });
}

export async function setupKioskExperienceAndPublish(input: KioskSetupInput): Promise<ActionResult> {
  if (!input.siteId) return failure("SITE_REQUIRED", "Choose a site.");
  return runAction("Could not save the kiosk experience.", async () => {
    const config = await api.post<{ id: string }>("/kiosk-experience", {
      siteId: input.siteId,
      configName: optional(input.configName) ?? "Site default",
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
    revalidatePath("/onboarding");
  });
}

export async function publishLatestKioskVersion(configId: string): Promise<ActionResult> {
  const versions = await runAction("Could not load kiosk versions.", () =>
    api.get<Array<{ id: string }>>(`/kiosk-experience/${configId}/versions`),
  );
  if (!versions.ok) return versions;
  const draft = versions.data[0];
  if (!draft) return failure("NO_VERSION", "No version to publish.");
  return runAction("Could not publish the kiosk experience.", async () => {
    await api.post(`/kiosk-experience/${configId}/versions/${draft.id}/publish`);
    revalidatePath("/dashboard/site-experience/kiosk");
  });
}

export async function createQrReferenceAndRotate(input: QrSetupInput): Promise<ActionResult> {
  if (!input.siteId) return failure("SITE_REQUIRED", "Choose a site.");
  if (input.qrTypeCode !== "public_site_checkin") {
    return failure(
      "QR_TYPE_UNSUPPORTED",
      `QR type "${input.qrTypeCode}" has no consuming journey yet. Issue public_site_checkin only.`,
    );
  }
  return runAction("Could not create the QR code.", async () => {
    const reference = await api.post<{ id: string }>("/site-qr-references", input);
    await api.post(`/site-qr-references/${reference.id}/rotate`, {});
    revalidatePath("/dashboard/site-experience/qr");
    revalidatePath("/onboarding");
  });
}

export async function rotateQrReference(referenceId: string): Promise<ActionResult> {
  return runAction("Could not rotate the QR token.", async () => {
    await api.post(`/site-qr-references/${referenceId}/rotate`, {});
    revalidatePath("/dashboard/site-experience/qr");
  });
}

export async function setupEscalationAndPublish(input: EscalationSetupInput): Promise<ActionResult> {
  return runAction("Could not save the escalation policy.", async () => {
    const policy = await api.post<{ id: string }>("/host-notification-escalation", {
      siteId: optional(input.siteId),
      policyName: optional(input.policyName) ?? "Default escalation",
      visitorCategoryCode: input.visitorCategoryCode,
    });
    const version = await api.post<{ id: string }>(`/host-notification-escalation/${policy.id}/versions`, {
      waitSeconds: input.waitSeconds ?? 300,
      escalationActionCode: optional(input.escalationActionCode) ?? "notify_reception",
      alternateRecipientReference: input.alternateRecipientReference,
    });
    await api.post(`/host-notification-escalation/${policy.id}/versions/${version.id}/publish`);
    revalidatePath("/dashboard/site-experience/escalation");
  });
}

export async function publishLatestEscalationVersion(policyId: string): Promise<ActionResult> {
  const versions = await runAction("Could not load escalation versions.", () =>
    api.get<Array<{ id: string }>>(`/host-notification-escalation/${policyId}/versions`),
  );
  if (!versions.ok) return versions;
  const draft = versions.data[0];
  if (!draft) return failure("NO_VERSION", "No version to publish.");
  return runAction("Could not publish the escalation policy.", async () => {
    await api.post(`/host-notification-escalation/${policyId}/versions/${draft.id}/publish`);
    revalidatePath("/dashboard/site-experience/escalation");
  });
}
