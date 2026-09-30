"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function connectCimsoAction(input: {
  siteId: string;
  siteExternalId?: string;
  enabledInterfaceTypes?: number[];
  tcpHost?: string;
  tcpPort?: number;
  tlsEnabled?: boolean;
  clientLoginId?: string;
  credentialsSecretRef?: string;
  defaultHostId?: string;
}) {
  await api.post("/integrations/cimso/connect", input);
  revalidatePath("/dashboard/site-experience/cimso");
}

export async function syncCimsoReservationsAction(input: { siteId: string; siteExternalId?: string }) {
  const result = await api.post<{ recordsApplied?: number }>("/integrations/cimso/sync/reservations", input);
  revalidatePath("/dashboard/site-experience/cimso");
  return result;
}
