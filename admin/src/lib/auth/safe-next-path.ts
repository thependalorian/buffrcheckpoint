/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative URLs, absolute URLs, and backslash tricks.
 */
export function safeNextPath(candidate: string | null | undefined, fallback = "/dashboard/overview"): string {
  if (!candidate) return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return fallback;
  return trimmed;
}
