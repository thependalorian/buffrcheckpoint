import { requiredSecret } from "./required-secret";

const DEV_FALLBACK = "dev-only-link-token-pepper-not-for-production";

/**
 * Returns the key that signs a purpose-bound link or rating token (SC-2).
 * Reads QR_TOKEN_PEPPER only. The access-token signing secret is never a fallback, so a leak of one cannot forge the other.
 * In production a missing or short value throws; outside production a development fallback keeps local runs working.
 *
 * @param purpose - Stable label mixed into the key so a token made for one purpose never verifies for another.
 */
export function purposeTokenKey(purpose: string): string {
  return `${purpose}:${requiredSecret("QR_TOKEN_PEPPER", DEV_FALLBACK)}`;
}
