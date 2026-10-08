import type { Metadata } from "next";

import { PricingJsonLd } from "@/components/json-ld";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_PAGES, PRICING_CHANNEL_COSTS } from "@/lib/copy/marketing";
import { SIGNUP_STEPS } from "@/lib/copy/signup";
import { marketingPageTitle, marketingSectionTitle, marketingWideSection } from "@/lib/marketing-layout";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";
import { fetchPublicPricing } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

import { PricingTiers } from "./pricing-tiers";

export const metadata: Metadata = pageMetadata("pricing");

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
        <h1 className={`max-w-3xl ${marketingPageTitle}`}>
          Start with a printed QR code and the phones your visitors already carry.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">{MARKETING_PAGES.pricing.lead}</p>
        {fromFallback ? (
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">{MARKETING_PAGES.pricing.fallback}</p>
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
          <ol className="mt-10 grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <p className="mt-4 max-w-3xl text-muted-foreground">{MARKETING_PAGES.pricing.costsLead}</p>

          <div className="mt-10 -mx-4 min-w-0 overflow-x-auto border-y border-border bg-background px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium text-foreground">Channel</th>
                  <th className="px-6 py-4 font-medium text-foreground">Marginal cost</th>
                  <th className="px-6 py-4 font-medium text-foreground">Plan</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_CHANNEL_COSTS.map((row) => (
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
