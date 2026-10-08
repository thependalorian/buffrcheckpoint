import Image from "next/image";

import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { ReportingFigure } from "@/components/marketing/reporting-figure";
import { REPORTING_ANCHOR, reportingCopy } from "@/lib/copy/reporting";
import {
  marketingCapabilityCard,
  marketingNarrowSection,
  marketingPageTitle,
  marketingSectionTitle,
  marketingWideSection,
} from "@/lib/marketing-layout";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";

export const metadata: Metadata = pageMetadata("platform");

const LAYERS = [
  {
    title: "Check-in channels",
    items: ["NFC badge or phone", "QR invitation", "Tablet kiosk", "SMS", "Assisted entry"],
  },
  {
    title: "Site edge",
    items: ["Android kiosk", "Encrypted local cache", "NFC reader", "MDM-managed device policy"],
  },
  {
    title: "API and identity gateway",
    items: ["Authenticated API", "Rate limits", "Idempotency", "Signed device claims"],
  },
  {
    title: "Core application",
    items: ["Visit workflow", "Risk-based access", "RBAC", "Retention", "DSAR"],
  },
  {
    title: "Credential checks",
    items: ["Contact-channel confirmation", "Site-issued credentials", "NFC credential validation"],
  },
  {
    title: "Data and evidence",
    items: ["Encrypted Postgres", "Append-only audit log", "Evidence packs"],
  },
];

const ROLES = [
  ["Visitor", "Own confirmation only", "Complete own check-in", "None"],
  ["Host / Staff", "Their own visitors", "Approve, reject, update status", "None by default"],
  [
    "Owner-Operator",
    "Site roster and history for one site",
    "Front desk work, site config, compliance review, day-to-day admin",
    "Site reports and configuration exports",
  ],
  [
    "Front Desk Operator",
    "Current-day roster for assigned site",
    "Assisted check-in, sign-out, badge issue",
    "Current-day operational list",
  ],
  ["Site Manager", "Full history for assigned site", "Site fields, hosts, local configuration", "Site reports"],
  ["Regional Manager", "Aggregated sites in assigned region", "Limited regional configuration", "Regional reports"],
  [
    "Compliance / Audit Officer",
    "Organisation-wide records and audit trail",
    "Legal holds, retention review, DSAR workflow",
    "Evidence packs",
  ],
  [
    "System Administrator",
    "Configuration and operational metadata",
    "Roles, sites, policy, integrations",
    "Configuration and audit exports",
  ],
  ["Platform Support", "None by default", "Time-bound, approved support access only", "No routine export"],
];

export default function PlatformPage() {
  const faqs = [
    {
      q: "How does offline operation work?",
      a: "The kiosk keeps taking visitors during outages with an encrypted local cache, then syncs when the network returns. The screen shows notification pending until delivery succeeds. It never claims the host heard early.",
    },
    {
      q: "Where does Checkpoint enforce access control?",
      a: "In the API and database. Hiding a sidebar link never grants access. Sensitive reads, exports, corrections, and deletions follow the signed-in user's role and site, and each one writes an immutable audit event.",
    },
    {
      q: "Do we invent our own roles and permissions?",
      a: "No. You invite people into a fixed role catalogue (Owner-Operator for a small site, or Front Desk, Site Manager, and the rest as you grow). Role changes are audited. Permission sets stay platform-owned.",
    },
    {
      q: "Does Checkpoint use AI to build check-in forms?",
      a: "Admins can optionally ask for field suggestions or translations when Form AI is enabled. Suggestions never publish themselves. Your team still sets each field's classification, and high-risk fields still need an approval reference before publish.",
    },
    {
      q: "Are public check-in forms available in multiple languages?",
      a: "Yes. Visitors can pick English, Afrikaans, or Portuguese on the public check-in page (or pass ?lang=). Field labels resolve from published translations when available, with English fallback.",
    },
  ];

  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.platform.src}
        backgroundAlt={MARKETING_HERO_IMAGES.platform.alt}
        layout="intro"
      >
        <h1 className={`max-w-3xl ${marketingPageTitle}`}>Six ways to check in. One encrypted record.</h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Every visitor gets through the door, whatever they carry. The channel changes from visitor to visitor. The
          data protection stays fixed.
        </p>
      </MarketingHero>

      <section className="border-b border-border bg-card">
        <div className={marketingWideSection}>
          <h2 className={marketingSectionTitle}>Architecture</h2>

          <div className="mt-12 grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {LAYERS.map((layer, i) => (
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
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Each person on your team sees the visitor records their job needs and nothing more. The server checks access
            on every request, so hiding a menu item never stands in for a permission.
          </p>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            On a small site, one trusted Owner-Operator account covers front desk, site setup, and day-to-day admin. As
            the team grows, hand out the separate roles below from the same fixed catalogue.
          </p>

          <div className="mt-10 -mx-4 overflow-x-auto rounded-none border-y border-border bg-card px-4 sm:mx-0 sm:rounded-2xl sm:border sm:px-0">
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
                {ROLES.map((row) => (
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

          <div className="mt-10 divide-y divide-border bc-surface">
            {faqs.map((item) => (
              <details key={item.q} className="group px-6 py-4">
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
