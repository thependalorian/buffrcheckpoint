"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

/** Recomputes visit_daily_fact / visit_hourly_fact over all history. */
export async function backfillAnalyticsAction() {
  await api.post("/platform/analytics/etl-runs/backfill", {});
  revalidatePath("/analytics");
}
