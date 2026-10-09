/**
 * Seconds until a JWT expires, read from its payload without verifying it (the API verifies every request).
 * Returns null when the token cannot be read, which callers treat as "refresh now".
 */
export function secondsUntilExpiry(token: string, nowMs: number = Date.now()): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(part.length / 4) * 4, "=");
    const exp = (JSON.parse(atob(base64)) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp - nowMs / 1000 : null;
  } catch {
    return null;
  }
}
