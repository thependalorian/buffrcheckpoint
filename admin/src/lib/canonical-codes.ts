/**
 * Canonical codes for the admin app.
 * Keep aligned with `buffrcheckpoint/shared/src` (source of truth).
 * Duplicated here so Vercel (admin-only root) can build without a monorepo install.
 */
export const IDENTITY_ASSURANCE_LEVEL_CODES = ["V0", "V1", "V2", "V3", "V4"] as const;
export type IdentityAssuranceLevelCode = (typeof IDENTITY_ASSURANCE_LEVEL_CODES)[number];

export function isIdentityAssuranceLevelCode(value: string): value is IdentityAssuranceLevelCode {
  return (IDENTITY_ASSURANCE_LEVEL_CODES as readonly string[]).includes(value);
}

/** Human-readable labels (buffrcheckpoint.md §3.1). UI shows these; codes remain in API/DB. */
export const IDENTITY_ASSURANCE_LEVEL_LABELS: Record<IdentityAssuranceLevelCode, string> = {
  V0: "Self-asserted identity",
  V1: "Contact-channel possession",
  V2: "Site-issued credential possession",
  V3: "DigiNam / NPKI verified identity",
  V4: "Official e-ID cryptographic validation",
};

export function identityAssuranceLevelLabel(code: string): string {
  if (isIdentityAssuranceLevelCode(code)) return IDENTITY_ASSURANCE_LEVEL_LABELS[code];
  return code;
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

export function isVisitStatusCode(value: string): value is VisitStatusCode {
  return (VISIT_STATUS_CODES as readonly string[]).includes(value);
}

export const VISIT_STATUS_LABELS: Record<VisitStatusCode, string> = {
  pending_sync: "Pending sync",
  checked_in: "Checked in",
  checked_out: "Checked out",
  synced_ack: "Synced",
  pending_approval: "Pending approval",
  admitted: "Admitted",
  entry_rejected: "Entry rejected",
};

export function visitStatusLabel(code: string): string {
  if (isVisitStatusCode(code)) return VISIT_STATUS_LABELS[code];
  return code.replaceAll("_", " ");
}
