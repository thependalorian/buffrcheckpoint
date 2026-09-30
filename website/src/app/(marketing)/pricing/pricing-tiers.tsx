"use client";

import { useMemo, useState } from "react";

import { MARKETING_PRIMARY_CTA } from "@/lib/copy/signup";
import {
  marketingPricingCard,
  marketingPricingCardFeatured,
} from "@/lib/marketing-layout";

export type BillingPeriod = "monthly" | "annual";

export type PublicCatalogItem = {
  code: string;
  label: string;
  tagline: string;
  monthlyAmount: string;
  currencyCode: string;
  annualMonthsCharged: number;
  annualTotal: string;
  effectiveMonthlyAnnual: string;
  includedSites: number;
  /** Monthly price per site above includedSites; null when the plan covers a fixed number of sites. */
  extraSiteMonthlyAmount: string | null;
  features: string[];
  isFeatured: boolean;
  sortOrder: number;
};

export type PublicPricingPayload = {
  billingPeriods: Array<{ code: string; label: string; note?: string }>;
  plans: PublicCatalogItem[];
  addons?: PublicCatalogItem[];
};

type BillingPeriodState = BillingPeriod;

const MAX_SITES = 500;

function nad(n: number): string {
  return `N$ ${n.toLocaleString("en-NA", { maximumFractionDigits: 2 })}`;
}

/** Monthly list price for a site count; mirrors planMonthlyForSites in backend billing.service.ts. */
function monthlyForSites(item: PublicCatalogItem, sites: number): number {
  const extraSites = Math.max(0, sites - item.includedSites);
  const extraPrice = item.extraSiteMonthlyAmount === null ? 0 : Number(item.extraSiteMonthlyAmount);
  return Number(item.monthlyAmount) + extraSites * extraPrice;
}

function coversSites(item: PublicCatalogItem, sites: number): boolean {
  return item.extraSiteMonthlyAmount !== null || sites <= item.includedSites;
}

function formatPlanPrice(
  item: PublicCatalogItem,
  period: BillingPeriodState,
  sites: number,
): { primary: string; secondary: string } {
  const monthly = monthlyForSites(item, sites);
  if (period === "monthly") {
    return { primary: nad(monthly), secondary: "/ month" };
  }
  const yearly = monthly * item.annualMonthsCharged;
  return {
    primary: nad(Math.round((yearly / 12) * 100) / 100),
    secondary: `/ month, billed ${nad(yearly)} / year`,
  };
}

function siteAllowance(item: PublicCatalogItem): string {
  const included = `${item.includedSites} site${item.includedSites === 1 ? "" : "s"} included`;
  return item.extraSiteMonthlyAmount === null
    ? included
    : `${included}, then ${nad(Number(item.extraSiteMonthlyAmount))} per extra site a month`;
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-6 flex-1 space-y-2.5 text-sm leading-snug text-muted-foreground">
      {items.map((f) => (
        <li key={f} className="flex gap-2.5">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingTiers({ catalog }: { catalog: PublicPricingPayload }) {
  const [period, setPeriod] = useState<BillingPeriodState>("monthly");
  const [sites, setSites] = useState(1);
  const plans = useMemo(() => [...catalog.plans].sort((a, b) => a.sortOrder - b.sortOrder), [catalog.plans]);
  const annualNote = catalog.billingPeriods.find((p) => p.code === "annual")?.note;

  return (
    <div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-lg border border-border bg-card p-1"
        >
          <button
            type="button"
            aria-pressed={period === "monthly"}
            onClick={() => setPeriod("monthly")}
            className={`min-h-10 rounded-md px-4 text-sm font-medium transition-colors ${
              period === "monthly" ? "bc-active-soft text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={period === "annual"}
            onClick={() => setPeriod("annual")}
            className={`min-h-10 rounded-md px-4 text-sm font-medium transition-colors ${
              period === "annual" ? "bc-active-soft text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
          </button>
        </div>
        <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
          How many sites?
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_SITES}
            step={1}
            value={sites}
            onChange={(e) => setSites(Math.min(MAX_SITES, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
            className="min-h-10 w-20 rounded-md border border-border bg-card px-3 text-center font-medium text-foreground"
          />
        </label>
      </div>
      {period === "annual" && annualNote ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">{annualNote}</p>
      ) : null}

      <div className="mt-10 grid min-w-0 gap-5 md:grid-cols-3">
        {plans.map((tier) => {
          const covers = coversSites(tier, sites);
          const price = formatPlanPrice(tier, period, covers ? sites : tier.includedSites);
          return (
            <article
              key={tier.code}
              className={tier.isFeatured ? marketingPricingCardFeatured : marketingPricingCard}
            >
              <div className="flex min-h-7 items-center">
                {tier.isFeatured ? <p className="bc-marketing-eyebrow">Recommended</p> : null}
              </div>
              <h2 className="font-heading text-xl font-medium tracking-tight text-foreground">{tier.label}</h2>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{tier.tagline}</p>
              <p className="mt-5 font-heading text-2xl font-light tracking-tight text-foreground">
                {price.primary}
                <span className="mt-1 block text-sm font-normal text-muted-foreground">{price.secondary}</span>
              </p>
              <p className="mt-3 text-sm text-foreground">
                {covers
                  ? `Priced for ${sites} site${sites === 1 ? "" : "s"}`
                  : `Covers ${tier.includedSites} site${tier.includedSites === 1 ? "" : "s"}. Choose Network or Assure for ${sites}.`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{siteAllowance(tier)}</p>

              <FeatureList items={tier.features} />

              <a
                href={MARKETING_PRIMARY_CTA.href}
                className={`mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                  tier.isFeatured
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                {MARKETING_PRIMARY_CTA.label}
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
