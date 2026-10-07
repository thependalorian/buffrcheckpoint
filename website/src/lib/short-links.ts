/** The short links sent by text message (/o/<token> to sign out, /r/<token> to rate) and where they lead. */

const COMPACT_TOKEN = /^[A-Za-z0-9_-]{41}$/;

export type ShortLinkKind = "signOut" | "rate";

/** The page and query for a short link, or the plain page when the token is not the expected shape. The API judges the token itself. */
export function shortLinkTarget(kind: ShortLinkKind, token: string): string {
  const valid = COMPACT_TOKEN.test(token);
  if (kind === "signOut") return valid ? `/check-out?v=${encodeURIComponent(token)}` : "/check-out";
  return valid ? `/rate?t=${encodeURIComponent(token)}` : "/rate";
}
