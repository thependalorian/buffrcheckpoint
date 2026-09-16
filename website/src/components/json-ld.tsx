const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buffrcheckpoint.com";

/** Structured data for marketing pages — SoftwareApplication + Organization on the home page. */
export function HomeJsonLd() {
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Buffr Checkpoint",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        description:
          "Visitor management and compliance for Namibian organisations — encrypted records, RBAC, and audit-ready evidence.",
      },
      {
        "@type": "SoftwareApplication",
        name: "Buffr Checkpoint",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android kiosk",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "NAD",
          lowPrice: "1200",
          highPrice: "12000",
        },
        url: SITE_URL,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

export function PricingJsonLd() {
  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Buffr Checkpoint",
    description: "Tiered visitor management for SMEs through regulated enterprises in Namibia.",
    brand: { "@type": "Brand", name: "Buffr Checkpoint" },
    offers: [
      { "@type": "Offer", name: "Checkpoint Core", price: "1200", priceCurrency: "NAD" },
      { "@type": "Offer", name: "Checkpoint Professional", price: "3500", priceCurrency: "NAD" },
      { "@type": "Offer", name: "Checkpoint Verify", price: "7000", priceCurrency: "NAD" },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
