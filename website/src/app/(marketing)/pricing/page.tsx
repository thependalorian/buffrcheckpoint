import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { marketingPageTitle, marketingSectionTitle, marketingWideSection } from "@/lib/marketing-layout";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";
import { PricingJsonLd } from "@/components/json-ld";
import { SIGNUP_STEPS } from "@/lib/copy/signup";
import { fetchPublicPricing } from "@/lib/pricing";
import { PricingTiers } from "./pricing-tiers";

export const metadata: Metadata = pageMetadata("pricing");

const COSTS = [
  ["Public site QR + phone web", "Zero marginal cost", "Site default, no tablet required"],
  ["Assisted front-desk entry", "Zero marginal cost", "Included on every plan"],
  ["Dedicated kiosk / tablet", "Hardware CAPEX separate", "Optional add-on / Network"],
  ["QR (visitor's phone)", "Zero marginal cost", "Site (public site) / Network (invitation)"],
  ["SMS", "Per-message cost, billed by use", "Optional add-on when live"],
  ["NFC (phone tap)", "Zero marginal cost", "Network when enabled"],
  ["NFC badge (physical)", "Hardware cost separate", "Optional hardware"],
];

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
