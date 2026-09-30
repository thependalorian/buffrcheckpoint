"use server";

import { api } from "@/lib/api/client";

import type { AuditEventPage } from "./types";

export async function loadMoreAuditEvents(
  cursor: string,
  dateRange?: { from?: string; to?: string },
): Promise<AuditEventPage> {
  const qs = new URLSearchParams({
    cursor,
    ...(dateRange?.from ? { from: dateRange.from } : {}),
    ...(dateRange?.to ? { to: dateRange.to } : {}),
  });
  return api.get<AuditEventPage>(`/audit/events?${qs}`);
}
