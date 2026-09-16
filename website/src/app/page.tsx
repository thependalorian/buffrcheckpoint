import Image from "next/image";
import Link from "next/link";

import { CheckCircle2, MessageSquare, Nfc, QrCode, Smartphone, Tablet, UserCheck, XCircle } from "lucide-react";
import { Metadata } from "next";

import { CapabilityStatusBadge } from "@/components/capability-status-badge";
import { HomeJsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  // No title override: inherits layout.tsx's `default`
  // ("Buffr Checkpoint: Secure Visitor Check-In") directly, un-templated —
  // every other page's title runs through the "%s | Buffr Checkpoint"
  // template, but templating the home page's own title against itself
  // would read "Buffr Checkpoint: Secure Visitor Check-In | Buffr
  // Checkpoint," a real duplication bug fixed here.
  description:
    "Buffr Checkpoint is a Namibia-built digital visitor and access-management platform. Replace paper registers with isolated records, risk-based controls, and offline-first operation.",
};

const capabilities = [
  {
    title: "NFC-forward check-in",
    description:
      "Tap-to-check-in with NFC badges, phone credentials, and future government e-ID support gives contractors and frequent visitors a fast lane.",
  },
  {
    title: "Feature-phone inclusive",
    description: "USSD, SMS, and assisted kiosk check-in let every visitor check in securely without a smartphone.",
  },
  {
    title: "Offline-first operation",
    description:
      "Encrypted local cache and sync queue keep check-in flowing during outages. No connectivity, no problem.",
  },
  {
    title: "Risk-based access control",
    description:
      "Identity assurance levels V0–V4 match the risk of the site, visit, and zone. Collect the least data that safely meets the purpose.",
  },
  {
    title: "Audit-ready evidence",
    description:
      "Append-only audit logs, retention automation, and evidence-pack export prove control effectiveness to auditors and regulators.",
  },
  {
    title: "Multi-channel, one record",
    description:
      "NFC, QR, kiosk, USSD, SMS, and assisted check-in all feed one secure, isolated visitor record architecture.",
  },
];

const steps = [
  {
    num: "01",
    title: "Arrival",
    description: "Visitor picks a check-in channel: NFC, QR, kiosk, USSD, SMS, or assisted front-desk entry.",
  },
  {
    num: "02",
    title: "Verification",
    description:
      "Buffr Checkpoint applies risk-based identity assurance: self-declared, mobile possession, NFC credential, or DigiNam verification where enabled.",
  },
  {
    num: "03",
    title: "Record",
    description:
      "An encrypted, isolated visitor record is created. No shared register. No other visitor can see the data.",
  },
  {
    num: "04",
    title: "Notify",
    description:
      "The host is notified in real time with the visitor's name, purpose category, and verification status.",
  },
  {
    num: "05",
    title: "Access & Sign-Out",
    description:
      "Visitor receives a temporary badge if required. On departure, they sign out and the retention timer begins.",
  },
];

// Section 11.6.5.3's multi-channel strip — every inclusion channel
// converging on one protected record, given equal visual weight so
// feature-phone and no-phone visitors don't read as an afterthought.
const channels = [
  { icon: Nfc, label: "NFC badge" },
  { icon: QrCode, label: "QR invitation" },
  { icon: Tablet, label: "Kiosk" },
  { icon: Smartphone, label: "USSD" },
  { icon: MessageSquare, label: "SMS" },
  { icon: UserCheck, label: "Assisted entry" },
];

// Section 11.6.5.3's "operational proof" — three real product screenshots,
// captured from the actual admin app against a synthetic demo tenant
// (Section 11.6.5.9's governance rule: synthetic data only, never a real
// customer's). Not stock photography or a mockup — the real UI.
const productScreenshots = [
  {
    src: "/screenshots/front-desk.png",
    alt: "Buffr Checkpoint Front Desk screen showing three checked-in visitors with host, assurance level, and status",
    label: "Front Desk roster",
    caption: "Live on-site roster: who's here, who they're seeing, how they were verified.",
  },
  {
    src: "/screenshots/device-compliance.png",
    alt: "Buffr Checkpoint Device Compliance Register showing two kiosk devices with CRAN status and deployability",
    label: "Device Compliance Register",
    caption: "Every kiosk tracked from unassessed to approved for deployment. No unregistered device.",
  },
  {
    src: "/screenshots/compliance-dashboard.png",
    alt: "Buffr Checkpoint Compliance Dashboard showing retention actions, deletion requests, and privileged access events",
    label: "Compliance Dashboard",
    caption: "Retention actions, deletion requests, and privileged access, on one screen.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <HomeJsonLd />
      <SiteHeader active="/" ctaLabel="Book a Review" />

      <main className="flex-1">
        {/* Hero — bg-background (cloud), the page default */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="mx-auto max-w-7xl px-4 py-20 lg:px-6 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 flex justify-center">
                <CapabilityStatusBadge capabilityCode="diginam_verification" label="DigiNam Verification" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Built for Africa's Compliance.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Buffr Checkpoint replaces shared paper registers with isolated visitor records, risk-based identity
                controls, and offline-first operation, so every visitor can check in securely, with dignity.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/contact">Book a Paper Register Exposure Review</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/platform">See the Platform</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Paper Register Risk — moved directly after the hero per Section
            11.6.5.3 ("the strongest educational/product-placement section
            on the page"). A designed comparison, not a photo of a real
            register — bg-card (white) to read as a distinct, elevated
            section against the cloud page background. */}
        <section className="border-b border-border/40 bg-card py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                A paper visitor register is an everyday privacy and governance failure.
              </h2>
            </div>
            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background p-6">
                <div className="flex items-center gap-2 font-semibold text-destructive">
                  <XCircle className="size-5" />
                  Current paper process
                </div>
                <div className="mt-4 space-y-2.5 rounded-lg border border-border/60 bg-card p-4">
                  {["Anna N., 081 2•• ••••", "Petrus S., 081 7•• ••••", "Karin M., 081 4•• ••••"].map((line) => (
                    <div key={line} className="h-3 w-full rounded-full bg-muted" aria-hidden />
                  ))}
                  <p className="pt-1 text-muted-foreground text-xs">
                    Every name below reads every name above. The next visitor can see all of this.
                  </p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Visitors write in a shared book, and the next visitor reads their personal information.</li>
                  <li>Handwritten data is incomplete, inaccurate, and impossible to search or report on.</li>
                  <li>Paper stored in drawers offers no retention control, retrieval standard, or access log.</li>
                  <li>A lost or damaged page destroys the forensic trail.</li>
                  <li>Sign-in is disconnected from host approval.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/40 bg-background p-6">
                {/* text-primary here is raw sodium-yellow as foreground text
                    (~1.97:1 on the cloud background) — fails WCAG AA. Border
                    keeps the brand shade; text uses the darker ink pairing. */}
                <div className="flex items-center gap-2 font-semibold text-sodium-yellow-ink">
                  <CheckCircle2 className="size-5" />
                  Buffr Checkpoint response
                </div>
                <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-card p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Visitor record</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">Encrypted</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Access scope</span>
                    <span>Host + Compliance only</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Retention</span>
                    <span>Policy-governed</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Audit trail</span>
                    <span>Append-only</span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Isolated visitor records with no shared data between visitors.</li>
                  <li>Risk-based identity and access controls matched to site and visit context.</li>
                  <li>Encrypted records, retention automation, and immutable audit evidence.</li>
                  <li>Offline-first operation for low-connectivity sites.</li>
                  <li>Role-based access control enforced at the data and API layer.</li>
                </ul>
              </div>
            </div>
            <div className="mx-auto mt-10 max-w-2xl text-center">
              <p className="text-lg font-medium">
                The platform's real advantage isn't the tablet or the NFC reader. Buffr Checkpoint turns a neglected
                paper process into a properly governed system.
              </p>
              <div className="mt-6">
                <Button asChild size="lg">
                  <Link href="/contact">Book a Paper Register Exposure Review</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities grid — back to bg-background for section rhythm */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                One secure record architecture.
                <br />
                Every inclusion channel.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Whether a visitor carries a smartphone, a feature phone, or no phone at all, Buffr Checkpoint has a
                secure channel for them.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((capability) => (
                <Card key={capability.title} className="flex flex-col p-6">
                  <h3 className="text-lg font-semibold">{capability.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{capability.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Every visitor can check in — the multi-channel strip, bg-card
            for contrast against the sections above/below. */}
        <section className="border-b border-border/40 bg-card py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Every visitor can check in.</h2>
              <p className="mt-4 text-muted-foreground">
                Six channels, equal treatment, one protected record. No visitor is a second-class check-in.
              </p>
            </div>
            <div className="mx-auto mt-16 flex max-w-4xl flex-wrap items-center justify-center gap-3">
              {channels.map((channel, i) => (
                <div key={channel.label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-16 items-center justify-center rounded-2xl border border-border/60 bg-background">
                      <channel.icon className="size-6 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{channel.label}</span>
                  </div>
                  {i < channels.length - 1 ? <div className="h-px w-6 bg-border sm:w-10" aria-hidden /> : null}
                </div>
              ))}
            </div>
            <div className="mx-auto mt-8 flex max-w-4xl justify-center">
              <div className="h-px w-10 rotate-90 bg-border" aria-hidden />
            </div>
            <div className="mx-auto mt-2 flex max-w-4xl justify-center">
              <div className="rounded-2xl border border-primary/40 bg-background px-6 py-3 font-medium text-sm">
                One isolated, encrypted visitor record
              </div>
            </div>
          </div>
        </section>

        {/* How It Works — bg-background */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
              <p className="mt-4 text-muted-foreground">
                From arrival to sign-out, every step is designed for privacy, inclusion, and auditability.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-5">
              {steps.map((step) => (
                <div key={step.num} className="relative flex flex-col items-center text-center">
                  {/* WCAG 1.4.3 applies to rendered text regardless of AT
                      visibility — aria-hidden doesn't exempt it, so
                      text-primary/20 (sodium-yellow at low alpha, ~1.1:1)
                      still needed a real fix: text-slate/80 clears large-
                      text's 3:1 minimum while staying visibly secondary to
                      the full-strength title below. aria-hidden stays so
                      screen readers aren't handed a redundant "01" ahead of
                      the step title that already conveys the same order. */}
                  <span aria-hidden="true" className="text-4xl font-bold text-slate/80">
                    {step.num}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Operational proof — real product screenshots, bg-card. Section
            11.6.5.3: "this is where the site moves from 'nice reception
            tool' to 'governed control platform.'" */}
        <section className="border-b border-border/40 bg-card py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                A governed control platform, not a guest book.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Real screens from the admin app, shown against a synthetic demo site, never a customer's data.
              </p>
            </div>
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {productScreenshots.map((shot) => (
                <div key={shot.src} className="flex flex-col">
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={1228}
                      height={300}
                      className="h-auto w-full"
                      sizes="(min-width: 1024px) 33vw, 100vw"
                    />
                  </div>
                  <h3 className="mt-4 font-semibold">{shot.label}</h3>
                  <p className="mt-1 text-muted-foreground text-sm">{shot.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA — Section 11.6.5.3: "no image needed, a plain
            high-contrast panel." Sodium Yellow, rationed to this one
            moment on the page. */}
        <section className="bg-primary py-20">
          <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
            <h2 className="text-2xl font-bold text-primary-foreground tracking-tight sm:text-3xl">
              Replace your paper register before it becomes your next privacy incident.
            </h2>
            <div className="mt-8">
              <Button asChild size="lg" variant="secondary">
                <Link href="/contact">Book a Paper Register Exposure Review</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 py-12">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex flex-col items-center gap-1 md:items-start">
                <Link href="/" className="flex items-center gap-2">
                  <Image src="/icon.png" alt="Buffr Checkpoint" width={24} height={24} className="rounded-md" />
                  <span className="text-lg font-semibold">Buffr Checkpoint</span>
                </Link>
                <p className="text-sm text-muted-foreground">Built for Africa's Compliance.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
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
