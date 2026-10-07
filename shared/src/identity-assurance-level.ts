/**
 * Canonical identity_assurance_level codes V0–V4 — keep in sync with
 * type_definition domain `identity_assurance_level` (seed 0001 / migration 0018).
 * Labels are the constitutional names from buffrcheckpoint.md §3.1.
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
