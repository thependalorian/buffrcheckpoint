/**
 * Canonical visit_status codes — keep in sync with type_definition domain
 * `visit_status` (seed 0001 / migration 0012). Surfaces: admin, backend,
 * website, ops-console, kiosk (Kotlin mirror in Enums.kt).
 */
export const VISIT_STATUS_CODES = [
  "pending_sync",
  "checked_in",
  "checked_out",
  "synced_ack",
  "pending_approval",
  "admitted",
  "entry_rejected",
] as const;

export type VisitStatusCode = (typeof VISIT_STATUS_CODES)[number];

export const VISIT_STATUS_LABELS: Record<VisitStatusCode, string> = {
  pending_sync: "Pending sync",
  checked_in: "Checked in",
  checked_out: "Checked out",
  synced_ack: "Synced (acknowledged)",
  pending_approval: "Pending host approval",
  admitted: "Admitted",
  entry_rejected: "Entry rejected",
};

export function isVisitStatusCode(value: string): value is VisitStatusCode {
  return (VISIT_STATUS_CODES as readonly string[]).includes(value);
}

/** Statuses that still count as “on site” for roster / emergency snapshot. */
export const OPEN_VISIT_STATUS_CODES: readonly VisitStatusCode[] = [
  "pending_sync",
  "checked_in",
  "synced_ack",
  "pending_approval",
  "admitted",
];
