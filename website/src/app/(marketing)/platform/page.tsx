import Image from "next/image";

import type { Metadata } from "next";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { ReportingFigure } from "@/components/marketing/reporting-figure";
import { MARKETING_PAGES, PLATFORM_FAQS, PLATFORM_LAYERS, PLATFORM_ROLES } from "@/lib/copy/marketing";
import { REPORTING_ANCHOR, reportingCopy } from "@/lib/copy/reporting";
import {
  marketingCapabilityCard,
  marketingNarrowSection,
  marketingPageTitle,
  marketingSectionTitle,
  marketingWideSection,
} from "@/lib/marketing-layout";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("platform");

export default function PlatformPage() {
  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.platform.src}
        backgroundAlt={MARKETING_HERO_IMAGES.platform.alt}
        layout="intro"
      >
        <h1 className={`max-w-3xl ${marketingPageTitle}`}>However they arrive, one encrypted record.</h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">{MARKETING_PAGES.platform.lead}</p>
      </MarketingHero>

      <section className="border-b border-border bg-card">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>Architecture</h2>

          <div className="mt-12 grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_LAYERS.map((layer, i) => (
              <div key={layer.title} className={`min-w-0 ${marketingCapabilityCard}`}>
                <p className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-heading text-lg font-medium text-foreground">{layer.title}</h3>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {layer.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id={REPORTING_ANCHOR} className="scroll-mt-20 border-b border-border bg-background">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>{reportingCopy.title}</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">{reportingCopy.intro}</p>

          <div className="mt-12 grid min-w-0 gap-8 lg:grid-cols-2 lg:items-start">
            <ol className="min-w-0 space-y-6">
              {reportingCopy.principles.map((item, i) => (
                <li key={item.title} className="flex gap-4">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-medium text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ReportingFigure {...reportingCopy.figures.busyHours} />
          </div>

          <h3 className="mt-16 font-heading text-xl font-medium text-foreground">{reportingCopy.audiencesTitle}</h3>
          <div className="mt-6 space-y-6">
            {reportingCopy.audiences.map((card, index) => (
              <div
                key={card.who}
                className={`grid min-w-0 overflow-hidden p-0! ${index % 2 === 1 ? "md:grid-cols-[2fr_3fr]" : "md:grid-cols-[3fr_2fr]"} ${marketingCapabilityCard}`}
              >
                <div
                  className={`flex items-center border-b border-border bg-[color-mix(in_srgb,var(--color-cloud)_70%,var(--color-pure-white))] p-4 sm:p-6 md:border-b-0 ${index % 2 === 1 ? "md:order-2 md:border-l" : "md:border-r"}`}
                >
                  <Image
                    src={card.image.src}
                    alt={card.image.alt}
                    width={card.image.width}
                    height={card.image.height}
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="h-auto w-full rounded-lg border border-border bg-background"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.who}</p>
                  <p className="mt-3 font-heading text-xl font-medium text-foreground">{card.question}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{card.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <ReportingFigure {...reportingCopy.figures.channels} />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>Role-based access control</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">{MARKETING_PAGES.platform.rbacLead1}</p>
          <p className="mt-4 max-w-3xl text-muted-foreground">{MARKETING_PAGES.platform.rbacLead2}</p>

          <div className="mt-10 -mx-4 overflow-x-auto border-y border-border bg-card px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium text-foreground">Role</th>
                  <th className="px-6 py-4 font-medium text-foreground">View rights</th>
                  <th className="px-6 py-4 font-medium text-foreground">Change rights</th>
                  <th className="px-6 py-4 font-medium text-foreground">Export rights</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_ROLES.map((row) => (
                  <tr key={row[0]} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground">{row[0]}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row[1]}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row[2]}</td>
                    <td className="px-6 py-4 text-muted-foreground">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-card">
        <div className={marketingNarrowSection}>
          <h2 className={marketingSectionTitle}>Frequently asked</h2>

          <div className="mt-10 divide-y divide-border border-y border-border">
            {PLATFORM_FAQS.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <span className="min-w-0 flex-1 font-medium text-foreground">{item.q}</span>
                  <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <MarketingPageClose page="platform" />
    </>
  );
}
