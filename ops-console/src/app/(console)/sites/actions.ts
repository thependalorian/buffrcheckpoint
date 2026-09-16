"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function updateSiteStatusAction(
  siteId: string,
  organisationId: string,
  statusCode: string,
) {
  await api.patch(`/platform/dashboard/sites/${siteId}/status`, {
    organisationId,
    statusCode,
  });
  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/sites");
}
