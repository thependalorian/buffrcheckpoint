"use server";

import { api } from "@/lib/api/client";

import type { AuditEventPage } from "./types";

export async function loadMoreAuditEvents(cursor: string): Promise<AuditEventPage> {
  return api.get<AuditEventPage>(`/audit/events?cursor=${encodeURIComponent(cursor)}`);
}
