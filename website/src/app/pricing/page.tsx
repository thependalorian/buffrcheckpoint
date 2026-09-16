import Image from "next/image";
import Link from "next/link";

import { Metadata } from "next";

import { CapabilityStatusBadge } from "@/components/capability-status-badge";
import { PricingJsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Checkpoint Core, Professional, Verify, Access, and Assurance tiers. NFC and DigiNam verification included where specified.",
};

const tiers = [
  {
    name: "Checkpoint Core",
    planBadge: "Starter",
    tagline: "Single-site SME or office",
    price: "From N$ 1,200 / month",
    includes: [
      "Tablet/kiosk check-in",
      "Assisted entry",
      "RBAC (Owner-Operator bundle)",
      "Encrypted visitor record",
      "Sign-out",
      "Reports",
      "Offline capability",
    ],
    cta: "Get Started",
    href: "/contact",
  },
  {
    name: "Checkpoint Professional",
    planBadge: "Professional",
    tagline: "Banks, clinics, corporate networks",
    price: "From N$ 3,500 / month",
    includes: [
      "Everything in Core",
      "Multi-site dashboard",
      "Host notification",
      "Pre-registration",
      "QR, SMS, USSD",
      "Audit export",
      "Site manager reporting",
      "NFC phone-tap check-in",
    ],
    cta: "Talk to Sales",
    href: "/contact",
    featured: true,
  },
  {
    name: "Checkpoint Verify",
    planBadge: "Regulated",
    tagline: "Government, regulated institutions",
    price: "From N$ 7,000 / month",
    includes: [
      "Everything in Professional",
      "DigiNam verifier workflow (where approved)",
      "NFC badges",
      "Visitor assurance levels V0–V4",
      "High-risk visit policies",
    ],
    cta: "Talk to Sales",
    href: "/contact",
  },
  {
    name: "Checkpoint Access",
    planBadge: "Enterprise",
    tagline: "Critical infrastructure and large enterprises",
    price: "From N$ 12,000 / month",
    includes: [
      "Everything in Verify",
      "Physical access-control integration",
      "Contractor credentials",
      "Zones and escort rules",
      "Emergency roster",
    ],
    cta: "Talk to Sales",
    href: "/contact",
  },
  {
    name: "Checkpoint Assurance",
    planBadge: "Assurance add-on",
    tagline: "Regulated and assurance-led customers",
    price: "From N$ 4,500 / month",
    includes: ["Annual controls review", "Retention test", "RBAC review", "Recovery test", "Evidence pack generation"],
    cta: "Talk to Sales",
    href: "/contact",
  },
];

const channelCosts = [
  { channel: "Manual / kiosk entry", cost: "$0", note: "Included in every tier" },
  { channel: "USSD", cost: "Telco integration", note: "Standard from Starter tier" },
  { channel: "SMS", cost: "Per-message telco", note: "Standard from Starter tier" },
  { channel: "QR (visitor's own smartphone)", cost: "$0 marginal", note: "Standard from Starter tier" },
  { channel: "NFC (phone-tap)", cost: "$0 marginal", note: "Standard from Professional tier" },
  { channel: "NFC (physical badge)", cost: "~$0.20–$0.40/unit", note: "Optional add-on for frequent visitors" },
  {
    channel: "National e-ID NFC (future)",
    cost: "Near-zero marginal",
    note: "Enterprise/Regulated tier, activation targeted for national rollout",
  },
];

export default async function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PricingJsonLd />
      {/* Sticky top nav */}
      <SiteHeader active={"/pricing"} ctaLabel="Talk to Sales" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-6">
                Transparent Pricing
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Simple, channel-inclusive pricing.</h1>
              <p className="mt-6 text-lg text-muted-foreground">
                NFC capability is a standard feature from the Professional tier upward. USSD and SMS come standard from
                the Starter tier, because inclusion isn't a premium add-on.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <CapabilityStatusBadge capabilityCode="nfc_badge_checkin" label="NFC badge check-in" />
                <CapabilityStatusBadge capabilityCode="national_eid_nfc" label="National e-ID NFC" />
                <CapabilityStatusBadge capabilityCode="diginam_verification" label="DigiNam verification" />
              </div>
            </div>
          </div>
        </section>

        {/* Tier cards */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {tiers.map((tier) => (
                <Card key={tier.name} className={`flex flex-col p-6 ${tier.featured ? "border-primary" : ""}`}>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">{tier.planBadge}</Badge>
                    {tier.featured ? <Badge>Most Popular</Badge> : null}
                  </div>
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
                  <p className="mt-4 text-2xl font-bold">{tier.price}</p>
                  <Separator className="my-6" />
                  <ul className="flex-1 space-y-3 text-sm">
                    {tier.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6" variant={tier.featured ? "default" : "outline"}>
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Per-channel marginal cost */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Per-channel marginal cost</h2>
              <p className="mt-4 text-muted-foreground">
                Every channel produces the same isolated, encrypted record downstream, but the channels carry materially
                different marginal costs.
              </p>
            </div>
            <div className="mt-16 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left font-medium">Channel</th>
                    <th className="pb-3 text-left font-medium">Marginal cost</th>
                    <th className="pb-3 text-left font-medium">Positioning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {channelCosts.map((row) => (
                    <tr key={row.channel}>
                      <td className="py-4 font-medium">{row.channel}</td>
                      <td className="py-4 text-muted-foreground">{row.cost}</td>
                      <td className="py-4 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <Card className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Need a custom deployment plan?</h2>
              <p className="max-w-2xl text-muted-foreground">
                Every site is different. Tell us about your visitor volumes, connectivity, and risk profile, and we'll
                recommend the right tier and channel mix.
              </p>
              <Button asChild size="lg">
                <Link href="/contact">Talk to Sales</Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 py-12">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex flex-col items-center gap-1 md:items-start">
                <Link href="/" className="flex items-center gap-2">
                  <Image
                    src="/icon.png"
                    alt="Buffr Checkpoint"
                    width={24}
                    height={24}
                    className="rounded-md"
                    style={{ height: "auto" }}
                  />
                  <span className="text-lg font-semibold">Buffr Checkpoint</span>
                </Link>
                <p className="text-sm text-muted-foreground">Built for Africa's Compliance.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link href="/platform" className="hover:text-foreground transition-colors">
                  Platform
                </Link>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </div>
            </div>
            <Separator className="my-8" />
            <p className="text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Buffr Checkpoint. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
