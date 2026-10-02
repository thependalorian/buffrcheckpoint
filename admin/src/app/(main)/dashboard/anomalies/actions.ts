"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api/client";

export async function saveAnomalyRuleAction(
  siteId: string,
  ruleCode: string,
  body: {
    enabled: boolean;
    thresholdInt: number;
    windowMinutes?: number;
    windowStartLocal?: string;
    windowEndLocal?: string;
  },
): Promise<{ error?: string }> {
  try {
    await api.put(`/sites/${siteId}/anomaly-rules/${ruleCode}`, body);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the rule" };
  }
  revalidatePath("/dashboard/anomalies");
  return {};
}

export async function reviewAnomalyAlertAction(
  alertId: string,
  status: "acknowledged" | "dismissed" | "reopened",
): Promise<{ error?: string }> {
  try {
    await api.post(`/anomaly-alerts/${alertId}/review`, { status });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update the alert" };
  }
  revalidatePath("/dashboard/anomalies");
  return {};
}
