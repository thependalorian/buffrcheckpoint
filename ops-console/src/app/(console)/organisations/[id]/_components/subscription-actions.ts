"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function createOrganisationSubscriptionAction(input: {
  organisationId: string;
  planCode: string;
  billingPeriod: "monthly" | "annual";
  addonCodes: string[];
  siteQuantity: number;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await api.post("/platform/billing/subscriptions", {
      organisationId: input.organisationId,
      planCode: input.planCode,
      billingPeriod: input.billingPeriod,
      addonCodes: input.addonCodes,
      siteQuantity: input.siteQuantity,
    });
    revalidatePath(`/organisations/${input.organisationId}`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create subscription" };
  }
}

export async function attachOrganisationAddonAction(input: {
  organisationId: string;
  subscriptionId: string;
  addonCode: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await api.post(`/platform/billing/subscriptions/${input.subscriptionId}/addons`, {
      addonCode: input.addonCode,
    });
    revalidatePath(`/organisations/${input.organisationId}`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to attach add-on" };
  }
}

export async function detachOrganisationAddonAction(input: {
  organisationId: string;
  subscriptionId: string;
  addonCode: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await api.patch(
      `/platform/billing/subscriptions/${input.subscriptionId}/addons/${encodeURIComponent(input.addonCode)}/detach`,
      {},
    );
    revalidatePath(`/organisations/${input.organisationId}`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to detach add-on" };
  }
}

export async function setSubscriptionSiteQuantityAction(input: {
  organisationId: string;
  subscriptionId: string;
  siteQuantity: number;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  try {
    await api.patch(`/platform/billing/subscriptions/${input.subscriptionId}/sites`, {
      siteQuantity: input.siteQuantity,
      note: input.note,
    });
    revalidatePath(`/organisations/${input.organisationId}`);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update licensed sites" };
  }
}
