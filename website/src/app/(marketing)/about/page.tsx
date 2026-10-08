import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { marketingCapabilityCard, marketingNarrowSection, marketingPageTitle, marketingSectionTitle, marketingWideSection } from "@/lib/marketing-layout";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";

export const metadata: Metadata = pageMetadata("about");

const VALUES = [
  { title: "Privacy by design", body: "Data minimisation, retention control, and record isolation ship switched on." },
  { title: "Evidence-led", body: "Each control leaves evidence an auditor, board, or regulator reviews." },
  { title: "Offline-resilient", body: "A dropped connection should never send your front desk back to paper." },
  { title: "Risk-based", body: "Identity checks match the risk of the site, the visit, and the zone." },
];

export default function AboutPage() {
  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.about.src}
        backgroundAlt={MARKETING_HERO_IMAGES.about.alt}
        layout="intro"
      >
        <h1 className={`max-w-3xl ${marketingPageTitle}`}>Why we built Checkpoint</h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Walk into a bank branch, clinic, or government office in Namibia and you often sign a shared visitor book.
          Whoever holds the pen reads the names, phone numbers, and ID numbers above their own line. We built
          Checkpoint to replace that book for every visitor, whatever phone they carry.
        </p>
      </MarketingHero>

      <section className="border-b border-border bg-card">
        <div className={marketingNarrowSection}>
          <h2 className={marketingSectionTitle}>What the paper register gets wrong</h2>
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              A paper register shows names, phone numbers, ID numbers, employers, hosts, car registrations, and visit
              purposes to everyone who signs after. It keeps no access history and follows no retention rule. When a
              visitor asks what you hold about them, or an auditor asks who removed a page, you have nothing to show.
            </p>
            <p>
              Checkpoint gives each visitor an isolated, encrypted record. Staff get roles from a fixed catalogue,
              retention runs on a schedule, and every sensitive action leaves audit evidence. Check-in keeps working
              offline.
            </p>
            <p>
              NFC is the fastest way through the door. Plenty of visitors have no NFC phone or no phone at all,
              so the same platform covers visitors without one through assisted check-in at reception. Every channel writes to the
              same record.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>How we build</h2>

          <div className="mt-12 grid min-w-0 gap-6 md:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className={`min-w-0 ${marketingCapabilityCard}`}>
                <h3 className="font-heading text-lg font-medium text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingPageClose page="about" />
    </>
  );
}
