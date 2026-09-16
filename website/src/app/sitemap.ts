import type { MetadataRoute } from "next";

// Section 11.8.8: generated at build time from the actual page list
// (Section 1a.3, now 8 pages/states) — not hand-maintained separately.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buffrcheckpoint.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/platform", "/pricing", "/developers", "/about", "/status", "/contact", "/privacy", "/terms"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
