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
