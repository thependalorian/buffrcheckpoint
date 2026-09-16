"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function approveVisitAction(visitId: string) {
  await api.post(`/visits/${visitId}/approve`);
  revalidatePath("/dashboard/front-desk");
  revalidatePath("/dashboard/default");
}

export async function rejectVisitAction(visitId: string, reason: string) {
  await api.post(`/visits/${visitId}/reject`, { reason });
  revalidatePath("/dashboard/front-desk");
  revalidatePath("/dashboard/default");
}

export async function checkoutVisitAction(visitId: string) {
  await api.post(`/visits/${visitId}/check-out`);
  revalidatePath("/dashboard/front-desk");
  revalidatePath("/dashboard/default");
  revalidatePath("/dashboard/visitors");
}

export async function triggerEmergencyAction(siteId: string) {
  await api.post("/emergency/trigger", { siteId });
  revalidatePath("/dashboard/emergency");
}

export async function resolveEmergencyAction(eventId: string) {
  await api.post(`/emergency/${eventId}/resolve`);
  revalidatePath("/dashboard/emergency");
}
