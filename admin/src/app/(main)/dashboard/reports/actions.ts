"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function saveReportScheduleAction(
  reportCode: string,
  body: { enabled: boolean; recipientRoles: string[] },
): Promise<{ error?: string }> {
  try {
    await api.put(`/reports/schedules/${reportCode}`, body);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the schedule" };
  }
  revalidatePath("/dashboard/reports");
  return {};
}
