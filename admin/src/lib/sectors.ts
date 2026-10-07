import { backendUrl } from "@/lib/auth/backend-url";

export interface OrganisationSector {
  code: string;
  label: string;
}

/**
 * Used only when the sector list cannot be loaded, so sign-up is never blocked. The real list lives in the
 * `organisation_sector` type definitions and is served by the API; it is not duplicated here.
 */
export const FALLBACK_SECTORS: OrganisationSector[] = [{ code: "other", label: "Other" }];

export function isSectorList(value: unknown): value is OrganisationSector[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) => typeof row === "object" && row !== null && typeof row.code === "string" && typeof row.label === "string",
    )
  );
}

/** Server-side load of the configured sectors, in configured order. Falls back rather than throwing. */
export async function loadOrganisationSectors(): Promise<OrganisationSector[]> {
  try {
    const response = await fetch(backendUrl("/public/organisation-sectors"), { cache: "no-store" });
    if (!response.ok) return FALLBACK_SECTORS;
    const body: unknown = await response.json();
    return isSectorList(body) ? body : FALLBACK_SECTORS;
  } catch {
    return FALLBACK_SECTORS;
  }
}
