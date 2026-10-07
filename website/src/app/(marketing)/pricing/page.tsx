import type { Metadata } from "next";
import { cache } from "react";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { marketingPageTitle, marketingSectionTitle, marketingWideSection } from "@/lib/marketing-layout";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";
import { PricingJsonLd } from "@/components/json-ld";
import { SIGNUP_STEPS } from "@/lib/copy/signup";
import { PricingTiers, type PublicPricingPayload } from "./pricing-tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Checkpoint plans in NAD: Site for one location, Network for branch networks, Assure for regulated institutions. Priced per site.",
};

const COSTS = [
  ["Public site QR + phone web", "Zero marginal cost", "Site default, no tablet required"],
  ["Assisted front-desk entry", "Zero marginal cost", "Included on every plan"],
  ["Dedicated kiosk / tablet", "Hardware CAPEX separate", "Optional add-on / Network"],
  ["QR (visitor's phone)", "Zero marginal cost", "Site (public site) / Network (invitation)"],
  ["SMS", "Per-message cost, billed by use", "Optional add-on when live"],
  ["NFC (phone tap)", "Zero marginal cost", "Network when enabled"],
  ["NFC badge (physical)", "Hardware cost separate", "Optional hardware"],
];

/** Fallback when API is unreachable. Mirrors migration 0039 (plans only; add-ons are ops/sales). */
const FALLBACK_PRICING: PublicPricingPayload = {
  billingPeriods: [
    { code: "monthly", label: "Monthly" },
    { code: "annual", label: "Annual", note: "Two months free when billed yearly" },
  ],
  plans: [
    {
      code: "site",
      label: "Site",
      tagline: "One office, branch, or clinic",
      monthlyAmount: "1500.00",
      currencyCode: "NAD",
      annualMonthsCharged: 10,
      annualTotal: "15000.00",
      effectiveMonthlyAnnual: "1250.00",
      includedSites: 1,
      extraSiteMonthlyAmount: null,
      features: [
        "Unlimited visits",
        "Public site QR and phone web check-in",
        "Assisted front-desk entry",
        "Visitor records and sign-out",
        "Reports and encrypted visitor record",
        "Owner-Operator from the fixed role catalogue",
        "Tablet not required",
      ],
      isFeatured: false,
      sortOrder: 1,
    },
    {
      code: "network",
      label: "Network",
      tagline: "Branch networks, clinic groups, corporate offices",
      monthlyAmount: "4500.00",
      currencyCode: "NAD",
      annualMonthsCharged: 10,
      annualTotal: "45000.00",
      effectiveMonthlyAnnual: "3750.00",
      includedSites: 3,
      extraSiteMonthlyAmount: "950.00",
      features: [
        "Everything in Site",
        "Multi-site dashboard",
        "Host notification by email",
        "Pre-registration via QR",
        "NFC badge and phone check-in when enabled",
        "Kiosk entitlements when live",
        "Site-manager reporting",
        "Granular roles from the fixed catalogue",
        "Audit export",
      ],
      isFeatured: true,
      sortOrder: 2,
    },
    {
      code: "assure",
      label: "Assure",
      tagline: "Government and regulated institutions",
      monthlyAmount: "9500.00",
      currencyCode: "NAD",
      annualMonthsCharged: 10,
      annualTotal: "95000.00",
      effectiveMonthlyAnnual: "7916.67",
      includedSites: 3,
      extraSiteMonthlyAmount: "1500.00",
      features: [
        "Everything in Network",
        "Identity checks graded by site and visit risk",
        "High-risk visit policies",
        "Compliance dashboard and evidence packs",
      ],
      isFeatured: false,
      sortOrder: 3,
    },
  ],
};

function apiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const isLocal =
    !configured ||
    configured.includes("localhost") ||
    configured.includes("127.0.0.1");
  if (process.env.NODE_ENV === "development" && isLocal) {
    return configured || "http://localhost:3001";
  }
  // Production/preview: never call localhost even if env was copied from .env.local.
  if (isLocal) return "https://api.buffrcheckpoint.com";
  return configured;
}

type PricingFetchResult = { catalog: PublicPricingPayload; fromFallback: boolean };

const fetchPublicPricing = cache(async (): Promise<PricingFetchResult> => {
  try {
    const res = await fetch(`${apiBase()}/public/pricing`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { catalog: FALLBACK_PRICING, fromFallback: true };
    const data = (await res.json()) as PublicPricingPayload;
    if (!Array.isArray(data.plans) || data.plans.length === 0) {
      return { catalog: FALLBACK_PRICING, fromFallback: true };
    }
    return { catalog: data, fromFallback: false };
  } catch {
    return { catalog: FALLBACK_PRICING, fromFallback: true };
  }
});

export default async function PricingPage() {
  const { catalog, fromFallback } = await fetchPublicPricing();

  return (
    <>
      <PricingJsonLd plans={catalog.plans} />

      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.pricing.src}
        backgroundAlt={MARKETING_HERO_IMAGES.pricing.alt}
        layout="intro"
      >
        <h1 className={`max-w-3xl ${marketingPageTitle}`}>Start with a printed QR code and the phones your visitors already carry.</h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Site covers phone check-in and assisted entry at one location. Add kiosks, NFC, and SMS messaging when your sites need
          them.
        </p>
        {fromFallback ? (
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            Showing published list prices. Live catalog temporarily unavailable.
          </p>
        ) : null}
      </MarketingHero>

      <section className="border-b border-border bg-background">
        <div className={marketingWideSection}>
          <PricingTiers catalog={catalog} />
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>How to start</h2>
          <ol className="mt-10 grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {SIGNUP_STEPS.map((step, i) => (
              <li key={step.title}>
                <p className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-heading text-lg font-medium text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-card">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>What each channel costs to run</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Every channel produces the same encrypted record. The running cost differs, from nothing for a QR scan to a
            per-message fee for SMS.
          </p>

          <div className="mt-10 -mx-4 min-w-0 overflow-x-auto rounded-none border-y border-border bg-background px-4 sm:mx-0 sm:rounded-2xl sm:border sm:px-0">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium text-foreground">Channel</th>
                  <th className="px-6 py-4 font-medium text-foreground">Marginal cost</th>
                  <th className="px-6 py-4 font-medium text-foreground">Plan</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((row) => (
                  <tr key={row[0]} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground">{row[0]}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row[1]}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <MarketingPageClose page="pricing" />
    </>
  );
}
