"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export async function updateDeviceCranStatusAction(
  deviceId: string,
  organisationId: string,
  statusCode: string,
) {
  await api.post(`/platform/dashboard/devices/${deviceId}/status`, {
    organisationId,
    statusCode,
    reason: `Ops Console CRAN status → ${statusCode}`,
  });
  revalidatePath(`/devices/${deviceId}`);
  revalidatePath("/devices");
}
