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
