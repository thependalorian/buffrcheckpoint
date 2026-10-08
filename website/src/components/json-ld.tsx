import { absoluteUrl, SEO_PAGES, type SeoPageKey, SITE_NAME, SITE_URL } from "@/lib/seo";

type PlanPrice = { label: string; monthlyAmount: string; currencyCode: string };

function currencyOf(code: string | undefined): string {
  return code && code.length > 0 ? code : "NAD";
}

function JsonLd({ payload }: { payload: unknown }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify of data built in this file from our own plan source and constants, no visitor input
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />;
}

/** The lowest and highest monthly list price, read from the plan source so the structured data cannot drift from the pricing page. */
export function priceRange(plans: PlanPrice[]): { low: number; high: number; currency: string } | null {
  const amounts = plans.map((p) => Number(p.monthlyAmount)).filter((n) => Number.isFinite(n) && n > 0);
  if (amounts.length === 0) return null;
  return { low: Math.min(...amounts), high: Math.max(...amounts), currency: currencyOf(plans[0]?.currencyCode) };
}

/** Organisation, site and product data for the home page. Prices come from the plan source (see lib/pricing.ts). */
export function HomeJsonLd({ plans }: { plans?: PlanPrice[] }) {
  const range = plans ? priceRange(plans) : null;
  return (
    <JsonLd
      payload={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: SITE_URL,
            logo: `${SITE_URL}/icon.png`,
            description:
              "Visitor management and compliance for Namibian organisations. Encrypted records, role-based access, and audit-ready evidence.",
            areaServed: { "@type": "Country", name: "Namibia" },
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            publisher: { "@id": `${SITE_URL}/#organization` },
            inLanguage: "en-NA",
          },
          {
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web, Android kiosk",
            url: SITE_URL,
            ...(range
              ? {
                  offers: {
                    "@type": "AggregateOffer",
                    priceCurrency: range.currency,
                    lowPrice: String(range.low),
                    highPrice: String(range.high),
                    offerCount: plans?.length,
                  },
                }
              : {}),
          },
        ],
      }}
    />
  );
}

/** Where a page sits in the site, so a search result can show its trail. */
export function BreadcrumbJsonLd({ page }: { page: SeoPageKey }) {
  const current = SEO_PAGES[page];
  return (
    <JsonLd
      payload={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          {
            "@type": "ListItem",
            position: 2,
            name: "title" in current ? current.title : SITE_NAME,
            item: absoluteUrl(current.path),
          },
        ],
      }}
    />
  );
}

export function PricingJsonLd({ plans }: { plans?: PlanPrice[] }) {
  // No invented prices: when the plan source returns nothing there are no offers in the data at all.
  const offers = (plans ?? []).map((plan) => ({
    "@type": "Offer" as const,
    name: plan.label.startsWith("Checkpoint") ? plan.label : `Checkpoint ${plan.label}`,
    price: String(Number(plan.monthlyAmount)),
    priceCurrency: currencyOf(plan.currencyCode),
  }));
  return (
    <JsonLd
      payload={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: SITE_NAME,
        description: "Tiered visitor management for SMEs through regulated enterprises in Namibia.",
        brand: { "@type": "Brand", name: "Checkpoint" },
        ...(offers.length > 0 ? { offers } : {}),
      }}
    />
  );
}
