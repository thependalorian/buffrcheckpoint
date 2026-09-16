"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function updateOrganisationAction(input: {
  legalName: string;
  tradingName: string;
  defaultTimezone: string;
  sectorCode: string;
}) {
  const legalName = input.legalName.trim();
  const tradingName = input.tradingName.trim();
  if (legalName.length < 2) throw new Error("Legal name is required.");
  await api.patch("/organisations/me", {
    legalName,
    tradingName: tradingName || legalName,
    defaultTimezone: input.defaultTimezone.trim() || "Africa/Windhoek",
    sectorCode: input.sectorCode.trim() || undefined,
  });
  revalidatePath("/dashboard/organisation");
  revalidatePath("/dashboard/account");
}
