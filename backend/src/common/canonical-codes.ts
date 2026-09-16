/**
 * Canonical codes for the backend.
 * Keep aligned with `buffrcheckpoint/shared/src` (source of truth).
 * Inlined so Railway (backend-only upload root) builds without `file:../shared`.
 */
export const IDENTITY_ASSURANCE_LEVEL_CODES = ["V0", "V1", "V2", "V3", "V4"] as const;
export type IdentityAssuranceLevelCode = (typeof IDENTITY_ASSURANCE_LEVEL_CODES)[number];

export const IDENTITY_ASSURANCE_LEVEL_LABELS: Record<IdentityAssuranceLevelCode, string> = {
  V0: "Self-asserted identity",
  V1: "Contact-channel possession",
  V2: "Site-issued credential possession",
  V3: "DigiNam / NPKI verified identity",
  V4: "Official e-ID cryptographic validation",
};

export function isIdentityAssuranceLevelCode(value: string): value is IdentityAssuranceLevelCode {
  return (IDENTITY_ASSURANCE_LEVEL_CODES as readonly string[]).includes(value);
}

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

/** Statuses that still count as on site for roster / emergency snapshot. */
export const OPEN_VISIT_STATUS_CODES: readonly VisitStatusCode[] = [
  "pending_sync",
  "checked_in",
  "synced_ack",
  "pending_approval",
  "admitted",
];
