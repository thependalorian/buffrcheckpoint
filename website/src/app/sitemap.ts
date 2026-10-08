import type { MetadataRoute } from "next";

import { absoluteUrl, SEO_PAGES } from "@/lib/seo";

// Built from the same page list as the page metadata (lib/seo.ts), so a page cannot be in one and not the other. No last-modified date is
// given: a date that changes on every build tells a crawler nothing true, and search engines learn to ignore it.
export default function sitemap(): MetadataRoute.Sitemap {
  return Object.values(SEO_PAGES).map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
