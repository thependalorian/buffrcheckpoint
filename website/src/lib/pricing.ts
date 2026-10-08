import { cache } from "react";

import type { PublicPricingPayload } from "@/app/(marketing)/pricing/pricing-tiers";

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
  const isLocal = !configured || configured.includes("localhost") || configured.includes("127.0.0.1");
  if (process.env.NODE_ENV === "development" && isLocal) {
    return configured || "http://localhost:3001";
  }
  // Production/preview: never call localhost even if env was copied from .env.local.
  if (isLocal) return "https://api.buffrcheckpoint.com";
  return configured;
}

export type PricingFetchResult = { catalog: PublicPricingPayload; fromFallback: boolean };

export const fetchPublicPricing = cache(async (): Promise<PricingFetchResult> => {
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
