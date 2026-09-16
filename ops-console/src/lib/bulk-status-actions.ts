"use server";

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";

export interface BulkStatusResult {
  requested: number;
  updated: number;
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

/**
 * Bulk queue actions live here rather than beside one queue's page because a
 * single client component (components/bulk-queue-list.tsx) drives both the
 * ticket and incident queues, and a client component cannot receive a server
 * action as a prop.
 */
export async function bulkUpdateTicketStatusAction(
  ticketIds: string[],
  statusCode: string,
): Promise<BulkStatusResult | { error: string }> {
  try {
    const result = await api.patch<BulkStatusResult>("/platform/tickets/bulk-status", { ticketIds, statusCode });
    revalidatePath("/tickets");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bulk update failed" };
  }
}

export async function bulkUpdateIncidentStatusAction(
  incidentIds: string[],
  statusCode: string,
): Promise<BulkStatusResult | { error: string }> {
  try {
    const result = await api.patch<BulkStatusResult>("/platform/incidents/bulk-status", { incidentIds, statusCode });
    revalidatePath("/incidents");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Bulk update failed" };
  }
}

export async function updateOneTicketStatusAction(ticketId: string, statusCode: string) {
  await api.patch(`/platform/tickets/${ticketId}/status`, { statusCode });
  revalidatePath("/tickets");
}

export async function updateOneIncidentStatusAction(incidentId: string, statusCode: string) {
  await api.patch("/platform/incidents/status", { incidentId, statusCode });
  revalidatePath("/incidents");
}
