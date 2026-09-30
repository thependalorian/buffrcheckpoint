const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buffrcheckpoint.com";

/** Structured data for marketing pages — SoftwareApplication + Organization on the home page. */
export function HomeJsonLd() {
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Checkpoint",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        description:
          "Visitor management and compliance for Namibian organisations. Encrypted records, RBAC, and audit-ready evidence.",
      },
      {
        "@type": "SoftwareApplication",
        name: "Checkpoint",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android kiosk",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "NAD",
          lowPrice: "1500",
          highPrice: "9500",
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

export function PricingJsonLd({
  plans,
}: {
  plans?: Array<{ label: string; monthlyAmount: string; currencyCode: string }>;
}) {
  const offers =
    plans && plans.length > 0
      ? plans.map((plan) => ({
          "@type": "Offer" as const,
          name: plan.label.startsWith("Checkpoint") ? plan.label : `Checkpoint ${plan.label}`,
          price: String(Number(plan.monthlyAmount)),
          priceCurrency: plan.currencyCode || "NAD",
        }))
      : [
          { "@type": "Offer" as const, name: "Checkpoint Site", price: "1500", priceCurrency: "NAD" },
          { "@type": "Offer" as const, name: "Checkpoint Network", price: "4500", priceCurrency: "NAD" },
          { "@type": "Offer" as const, name: "Checkpoint Assure", price: "9500", priceCurrency: "NAD" },
        ];

  const payload = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Checkpoint",
    description: "Tiered visitor management for SMEs through regulated enterprises in Namibia.",
    brand: { "@type": "Brand", name: "Buffr" },
    offers,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
