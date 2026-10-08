import type { Metadata } from "next";

// One place for how each public page presents itself to search engines and when it is shared: its canonical address, title, description and
// share image. The sitemap and the page metadata both read from here, so a page cannot be in one and missing from the other.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://buffrcheckpoint.com").replace(/\/$/, "");
export const SITE_NAME = "Checkpoint";

/** Pages with their own generated share image (an `opengraph-image.tsx` beside the page); the rest use the default image. */
const GENERATED_IMAGE = new Set(["platform", "pricing", "developers", "about"]);

export interface SeoPage {
  /** Path under the site, starting with a slash. */
  path: string;
  /** Page title. The home page has none and uses the site default. */
  title?: string;
  description: string;
  /** Sitemap priority, 0 to 1. */
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
}

export const SEO_PAGES = {
  home: {
    path: "/",
    description:
      "Checkpoint replaces the paper visitor register with a private, encrypted record. It works offline and checks in people with or without a smartphone.",
    priority: 1,
    changeFrequency: "weekly",
  },
  platform: {
    path: "/platform",
    title: "Platform",
    description:
      "How Checkpoint works: check-in by phone, front desk, invitation, kiosk or NFC, all into one encrypted visitor record, with access checked on the server.",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  pricing: {
    path: "/pricing",
    title: "Pricing",
    description:
      "Checkpoint plans in NAD: Site for one location, Network for branch networks, Assure for regulated institutions. Priced per site.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  developers: {
    path: "/developers",
    title: "Developers",
    description:
      "Checkpoint API overview, authentication model, and integration boundaries for customer engineering teams.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  about: {
    path: "/about",
    title: "About",
    description:
      "Why we built Checkpoint, an independent visitor and access-management platform from Windhoek, Namibia.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  status: {
    path: "/status",
    title: "Status",
    description:
      "Current status of Checkpoint services and check-in features, so you can see whether a problem is on our side before you contact us.",
    priority: 0.3,
    changeFrequency: "weekly",
  },
  contact: {
    path: "/contact",
    title: "Contact",
    description:
      "Questions before you sign up, multi-site rollouts, hardware, integrations, or partnerships with Checkpoint.",
    priority: 0.7,
    changeFrequency: "yearly",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "How Buffr Checkpoint collects, uses, stores, and protects personal information in accordance with Namibia's data-protection direction.",
    priority: 0.4,
    changeFrequency: "monthly",
  },
  terms: {
    path: "/terms",
    title: "Terms & Conditions",
    description: "Standard SaaS terms for Buffr Checkpoint, scoped to the customer role model and packaging tiers.",
    priority: 0.4,
    changeFrequency: "monthly",
  },
} as const satisfies Record<string, SeoPage>;

export type SeoPageKey = keyof typeof SEO_PAGES;

/** Routes that carry a visitor's own token or a session: kept out of search engines and told to crawlers not to fetch them. */
export const PRIVATE_PATHS = ["/check-in", "/check-out", "/emergency", "/induction", "/rate", "/o/", "/r/"] as const;

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/** Metadata for one public page, including its canonical address so the same page under another hostname does not compete with itself. */
export function pageMetadata(key: SeoPageKey): Metadata {
  const page: SeoPage = SEO_PAGES[key];
  const shareTitle = page.title ? `${page.title} | ${SITE_NAME}` : "Checkpoint: Secure Visitor Check-In";
  return {
    ...(page.title ? { title: page.title } : {}),
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type: "website",
      locale: "en_NA",
      siteName: SITE_NAME,
      url: page.path,
      title: shareTitle,
      description: page.description,
      ...(GENERATED_IMAGE.has(key) ? {} : { images: ["/og.png"] }),
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: page.description,
      ...(GENERATED_IMAGE.has(key) ? {} : { images: ["/og.png"] }),
    },
  };
}

export function hasGeneratedImage(key: string): boolean {
  return GENERATED_IMAGE.has(key);
}
