"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function updateOrganisationCapabilityAction(input: {
  capabilityCode: string;
  enabled: boolean;
  configurationReference?: string;
}) {
  await api.patch("/organisation/capability-enablement", input);
  revalidatePath("/dashboard/site-experience/capabilities");
}
