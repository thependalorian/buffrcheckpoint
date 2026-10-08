import type { Metadata } from "next";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/copy/contact";
import { DEVELOPER_RESOURCES, MARKETING_PAGES } from "@/lib/copy/marketing";
import { marketingCapabilityCard, marketingNarrowSection, marketingPageTitle } from "@/lib/marketing-layout";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("developers");

export default function DevelopersPage() {
  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.developers.src}
        backgroundAlt={MARKETING_HERO_IMAGES.developers.alt}
        layout="intro"
      >
        <h1 className={marketingPageTitle}>Developer overview</h1>
        <p className="mt-6 text-base text-muted-foreground sm:text-lg">{MARKETING_PAGES.developers.lead}</p>
      </MarketingHero>

      <section className="bg-card">
        <div className={`${marketingNarrowSection} space-y-6`}>
          {DEVELOPER_RESOURCES.map((item) => (
            <div key={item.title} className={`min-w-0 ${marketingCapabilityCard}`}>
              <h2 className="font-heading text-lg font-medium text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            There is no public API reference yet. If you need to connect a system, email {PUBLIC_CONTACT_EMAIL} with
            your organisation and what you want to connect, and we will agree the integration with you.
          </p>
        </div>
      </section>

      <MarketingPageClose page="developers" />
    </>
  );
}
