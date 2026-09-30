export interface SuppressedCell {
  value: number | null;
  suppressed: boolean;
}

/**
 * Small-cell suppression for cross-organisation statistics. A count below
 * the threshold could point at one property or one guest, so it is withheld
 * as null (never shown as 0 — absence is not zero).
 */
export function suppress(count: number, minCell: number): SuppressedCell {
  if (count > 0 && count < minCell) return { value: null, suppressed: true };
  return { value: count, suppressed: false };
}

export function minCellThreshold(): number {
  const parsed = Number(process.env.ANALYTICS_MIN_CELL ?? 5);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 5;
}
