/**
 * Parses the explicit CORS origin allow-list (HD-2).
 * An unset or empty list denies every cross-origin request instead of allowing all; production refuses to start without one.
 *
 * @param raw - Comma-separated origins from CORS_ORIGIN.
 * @param log - Receives a warning when the list is empty.
 */
export function corsOrigins(raw: string | undefined, log?: { warn(message: string): void }): string[] | false {
  const list = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (list.length === 0) {
    log?.warn("CORS_ORIGIN is not set: cross-origin requests are denied");
    return false;
  }
  return list;
}
