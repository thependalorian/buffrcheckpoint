/**
 * Bounds a client-supplied page size (API-5). A missing, non-numeric, zero or negative value falls back to the default,
 * and anything above the maximum is cut to it, so no list endpoint can be asked for an unbounded scan.
 *
 * @param requested - The raw limit from the request; a number or numeric string, or nothing.
 * @param defaultSize - Used when the request gives no usable value.
 * @param maxSize - The ceiling for this list.
 */
export function clampPageSize(requested: number | string | undefined, defaultSize: number, maxSize: number): number {
  const parsed = typeof requested === "string" ? Number(requested) : requested;
  if (parsed === undefined || !Number.isFinite(parsed) || parsed < 1) return Math.min(defaultSize, maxSize);
  return Math.min(Math.trunc(parsed), maxSize);
}
