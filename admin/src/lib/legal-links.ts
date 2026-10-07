/** Where the public legal pages live. The admin links to them; it does not copy their text. */
export function websiteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://buffrcheckpoint.com").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const LEGAL_LINKS = {
  terms: websiteUrl("/terms"),
  privacy: websiteUrl("/privacy"),
} as const;
