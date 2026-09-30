import Image from "next/image";
import Link from "next/link";

import type { Metadata } from "next";

import { HomeJsonLd } from "@/components/json-ld";
import { ChannelConvergenceVisual } from "@/components/marketing/channel-convergence-visual";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MarketingProductScreenshot } from "@/components/marketing/marketing-product-screenshot";
import { PhoneProductFrame } from "@/components/marketing/phone-product-frame";
import { MARKETING_SECONDARY_PRICING_CTA } from "@/lib/copy/signup";
import { marketingCapabilityCard, marketingFeatureCard, marketingLead } from "@/lib/marketing-layout";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";

export const metadata: Metadata = {
  description:
    "A paper visitor register shows every name, phone number, and ID number to the next person who signs. Checkpoint gives each visitor a private, encrypted record, keeps working offline, and checks in people with or without a smartphone.",
};

const CAPABILITIES = [
  {
    title: "QR-first phone check-in",
    body: "Print your site QR code from admin. Visitors scan it and check in on their own phone browser.",
  },
  {
    title: "Assisted front desk",
    body: "Reception checks in visitors who have no phone, a feature phone, or trouble with the form. Their record gets the same encryption as a self check-in.",
  },
  {
    title: "Keeps working offline",
    body: "With a kiosk on site, check-in carries on through a network outage. Records stay encrypted on the device and sync once the connection returns, with no duplicates and a full audit trail.",
  },
  {
    title: "Checks sized to the risk",
    body: "A courier at a branch office and a contractor entering a server room need different identity checks. You set the level per site, visit, and zone.",
  },
  {
    title: "Audit-ready evidence",
    body: "Each time someone views, exports, corrects, or deletes a sensitive record, the system writes an audit event nobody edits afterwards.",
  },
  {
    title: "Optional fast lanes",
    body: "Add NFC badges, a dedicated kiosk, SMS, or USSD later. Each writes to the same record and switches on once our status page lists it as Live.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Arrival",
    body: "The visitor uses their own phone, a badge, the kiosk, or the front desk.",
  },
  {
    n: "02",
    title: "Verification",
    body: "The identity check matches the site. A bank vault asks for more than a clinic waiting room.",
  },
  {
    n: "03",
    title: "Record",
    body: "The visit becomes one encrypted record. Other visitors never see it.",
  },
  {
    n: "04",
    title: "Notify",
    body: "The host gets a notification. Sites with approval rules hold entry until the host says yes.",
  },
  {
    n: "05",
    title: "Access & sign-out",
    body: "Reception logs entry, escort rules apply, and sign-out closes the record.",
  },
];

export default function HomePage() {
  return (
    <>
      <HomeJsonLd />

      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.home.src}
        backgroundAlt={MARKETING_HERO_IMAGES.home.alt}
        layout="split"
      >
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Visitor and access management
          </p>
          <h1 className="mt-4 font-heading text-4xl font-light leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your next visitor reads every name in your register.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Name, phone number, ID number, who they came to see. Checkpoint gives each visitor a private, encrypted
            record instead of a line on a shared page. It keeps working when the network drops, and people without a
            smartphone still check in.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://admin.buffrcheckpoint.com/auth/register"
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create account
            </a>
            <Link
              href={MARKETING_SECONDARY_PRICING_CTA.href}
              className="inline-flex items-center rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {MARKETING_SECONDARY_PRICING_CTA.label}
            </Link>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center lg:justify-end">
          <div className="w-full max-w-[18rem]">
            <PhoneProductFrame label="Guest check-in on a phone">
              <Image
                src="/screenshots/phone-check-in.png"
                alt="The live Checkpoint check-in page on a guest's phone, with language, visitor type, name and mobile number fields."
                width={780}
                height={1500}
                priority
                className="h-auto w-full"
              />
            </PhoneProductFrame>
          </div>
        </div>
      </MarketingHero>

      <section className="border-b border-border bg-card">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Look at the last page of your visitor book.
          </h2>
          <p className={`mt-4 ${marketingLead}`}>
            Every line holds a name and phone number, and often an ID or passport number, a car registration, an
            employer, and the person the visitor came to see. The next visitor reads all of it while they sign. Nobody
            logs who photographed the page. When an auditor asks who saw a record last March, the book has no answer.
          </p>

          <div className="mt-12 grid min-w-0 gap-6 lg:grid-cols-2">
            <div className={`min-w-0 ${marketingFeatureCard}`}>
              <p className="bc-marketing-eyebrow">Paper register</p>
              <div className="mt-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-4 w-16 rounded bg-muted" />
                    <div className="h-4 flex-1 rounded bg-muted" />
                    <div className="h-4 w-20 rounded bg-muted" />
                  </div>
                ))}
              </div>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>
                  Name, phone, email, ID or passport number, vehicle registration, and purpose visible to the next
                  visitor
                </li>
                <li>No reliable access history</li>
                <li>No retention control</li>
                <li>No trace of who photographed a page or where a lost page went</li>
              </ul>
            </div>

            <div className={`min-w-0 ${marketingFeatureCard}`}>
              <p className="bc-marketing-eyebrow text-[var(--color-sodium-yellow-ink)]">Checkpoint</p>
              <div className="bc-surface-inset mt-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">Visitor record</span>
                  <span className="text-xs text-muted-foreground">Isolated</span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  {[
                    ["Access scope", "Reception, host"],
                    ["Encryption", "AES-256-GCM"],
                    ["Retention", "Site policy"],
                    ["Audit", "Hash-linked"],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="min-w-0 text-right break-words text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>One visitor record, visible only to authorised staff</li>
                <li>Every read, export, and change is audited</li>
                <li>Retention is enforced per site policy</li>
                <li>Compliance officers export evidence packs for auditors</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Six ways in. One private record per visitor.
          </h2>

          <div className="mt-12 grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className={`min-w-0 ${marketingCapabilityCard}`}>
                <h3 className="font-heading text-lg font-medium text-foreground">{cap.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{cap.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Smartphone, feature phone, or no phone at all.
          </h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Pick the channel that suits each visitor. The data protection stays the same on every one.
          </p>

          <div className="mt-12">
            <ChannelConvergenceVisual />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            How it works
          </h2>

          <ol className="mt-12 grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {STEPS.map((step) => (
              <li key={step.n}>
                <p className="font-mono text-xs text-muted-foreground">{step.n}</p>
                <h3 className="mt-2 font-heading text-lg font-medium text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="mx-auto min-w-0 max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <h2 className="font-heading text-2xl font-light tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            What your front desk and compliance team see.
          </h2>

          <div className="mt-12 grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MarketingProductScreenshot
              src="/screenshots/admin-overview.png"
              alt="Overview showing who is on site now, pending approvals, compliance alerts and a 90-day visit activity chart."
              caption="Overview: who is on site and what needs action"
              focusClassName="object-[28%_0%]"
            />
            <MarketingProductScreenshot
              src="/screenshots/admin-analytics.png"
              alt="Analytics showing check-ins, average time on site, share checked in on own phone and an arrivals trend."
              caption="Analytics: arrivals, busy hours and how guests check in"
              focusClassName="object-[30%_0%]"
            />
            <MarketingProductScreenshot
              src="/screenshots/compliance-dashboard.png"
              alt="Compliance Dashboard showing retention actions, deletion requests, privileged access events and offline sync exceptions."
              caption="Compliance Dashboard: exceptions and evidence"
              focusClassName="object-[30%_0%]"
            />
          </div>
        </div>
      </section>

      <MarketingPageClose page="home" />
    </>
  );
}
