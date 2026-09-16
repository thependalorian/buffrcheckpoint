import Image from "next/image";
import Link from "next/link";

import { Metadata } from "next";

import { CapabilityStatusBadge, fetchPublicCapabilityStatus } from "@/components/capability-status-badge";
import { SiteHeader } from "@/components/site-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "Explore Buffr Checkpoint's architecture: multi-modal check-in channels, risk-based identity assurance (V0–V4), role-based access control, and offline-first operation.",
};

const architectureLayers = [
  {
    title: "Check-in Channels",
    items: ["NFC / e-ID", "QR pre-registration", "Kiosk / tablet", "USSD", "SMS", "Assisted front-desk"],
  },
  {
    title: "Site Edge",
    items: ["Android kiosk app", "Encrypted local cache", "NFC reader", "Device policy / MDM"],
  },
  {
    title: "API & Identity Gateway",
    items: ["Authentication", "API keys & rate limits", "Idempotency", "Signed device claims"],
  },
  {
    title: "Core Application",
    items: ["Visit lifecycle", "Risk rules", "RBAC", "Retention & DSAR"],
  },
  {
    title: "Identity Adapters",
    items: ["DigiNam / NPKI", "e-ID (when approved)"],
  },
  {
    title: "Data & Evidence",
    items: [
      "Flexible-deployment PostgreSQL",
      "Notification service",
      "Append-only audit log",
      "Encrypted object store",
    ],
  },
];

const rbacRows = [
  { role: "Visitor", view: "Own confirmation only", change: "Complete own check-in", export: "None" },
  { role: "Host / Staff", view: "Their own visitors", change: "Approve, reject, update", export: "None by default" },
  {
    role: "Front Desk Operator",
    view: "Current-day roster (assigned site)",
    change: "Assisted check-in, sign-out, badge",
    export: "Current-day operational list",
  },
  {
    role: "Site Manager",
    view: "Full history (assigned site)",
    change: "Site fields, hosts, config",
    export: "Site reports",
  },
  {
    role: "Regional Manager",
    view: "Aggregated sites (assigned region)",
    change: "Limited regional config",
    export: "Regional reports",
  },
  {
    role: "Compliance / Audit Officer",
    view: "Organisation-wide records & audit trail",
    change: "Legal holds, retention, DSAR",
    export: "Evidence packs",
  },
  {
    role: "System Administrator",
    view: "Configuration & operational metadata",
    change: "Roles, sites, policy, integrations",
    export: "Configuration/audit exports",
  },
  {
    role: "Platform Support",
    view: "None by default",
    change: "Time-bound break-glass only",
    export: "No routine export",
  },
  {
    role: "DigiNam Verification Adapter",
    view: "Only required verification fields",
    change: "No human access",
    export: "None",
  },
];

function eidFaqAnswer(status: "not_available" | "targeted" | "live" | undefined): string {
  const label =
    status === "live" ? "live" : status === "targeted" ? "targeted" : "not available";
  return `The National e-ID smart card is a Ministry of Home Affairs (MHAISS) project. CRAN's roadmap records MHAISS as the first accredited CSP for e-ID rollout at national programme level. Buffr Checkpoint is building NFC reader compatibility ahead of relying-party enablement — separate from national issuance status. The Capability Status Register governs Buffr's product claim; it currently reads '${label}' — not a statement that Buffr verifies e-ID taps today or that cards are universally in circulation at every site.`;
}

const diginamFaq = {
  question: "How does DigiNam verification work today?",
  answer:
    "DigiNam/NPKI is Namibia's national digital-trust programme under CRAN as Root CA. CRAN's July 2026 roadmap records programme milestones including MHAISS (Ministry of Home Affairs) as the first accredited Certification Service Provider for e-ID rollout — that is national issuance, not Buffr Checkpoint product status. Buffr Checkpoint is built to support DigiNam/NPKI verification where formally enabled through an approved relying-party arrangement. The platform requests only necessary verification attributes and retains only the minimum proof/result. Buffr Checkpoint may only describe its own integration as live once a relying-party arrangement, working technical interface, interoperability testing, and privacy/contractual documentation are in place.",
};

const trailingFaqs = [
  {
    question: "How does offline operation work?",
    answer:
      "When the internet is unavailable, the kiosk creates an encrypted local record and confirms to the visitor: 'Check-in recorded. Host notification pending.' When the device reconnects, the sync queue transmits idempotently. The server records acceptance, sends the notification, deletes the local PII cache after confirmed sync, and writes an audit event recording offline creation and sync time.",
  },
  {
    question: "Is access control enforced only in the UI?",
    answer:
      "No. Access control is applied at the data and API layer, not only in the user interface. Every record carries tenant_id, site_id, and policy scope. Every sensitive read, export, correction, and deletion creates an immutable audit event. Site Managers cannot access another site merely by changing a URL or API request.",
  },
];

export default async function PlatformPage() {
  const capabilityStatus = await fetchPublicCapabilityStatus();
  const faqs = [
    diginamFaq,
    {
      question: "What is the current status of National e-ID NFC smart-card support?",
      answer: eidFaqAnswer(capabilityStatus?.nationalEidNfc),
    },
    ...trailingFaqs,
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky top nav */}
      <SiteHeader active={"/platform"} ctaLabel="Talk to Sales" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-3xl">
              <Badge variant="outline" className="mb-6">
                Platform Overview
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                One secure visitor-record service.
                <br />
                Multiple inclusion channels.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Buffr Checkpoint's architecture is built around a single principle: every visitor can check in. The
                channel changes. The data-protection standard doesn't.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Architecture</h2>
              <p className="mt-4 text-muted-foreground">
                From visitor channels to encrypted object storage, every layer is designed for privacy, resilience, and
                regulatory readiness.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {architectureLayers.map((layer) => (
                <Card key={layer.title} className="flex flex-col p-6">
                  <h3 className="text-lg font-semibold">{layer.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {layer.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            {/* Section 1a.3: the Digital Identity Layer's two states, marked
                explicitly and read from the live Capability Status Register
                (Section 4a.7) — never a hardcoded "live"/"targeted" string. */}
            <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
              <CapabilityStatusBadge capabilityCode="diginam_verification" label="DigiNam relying-party" />
              <CapabilityStatusBadge capabilityCode="national_eid_nfc" label="National e-ID NFC" />
              <CapabilityStatusBadge capabilityCode="nfc_badge_checkin" label="NFC badge check-in" />
              <CapabilityStatusBadge capabilityCode="qr_invitation_checkin" label="QR invitation" />
              <CapabilityStatusBadge capabilityCode="ussd" label="USSD" />
              <CapabilityStatusBadge capabilityCode="sms_contact_confirmation" label="SMS confirmation" />
            </div>
          </div>
        </section>

        {/* RBAC Table */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Role-Based Access Control</h2>
              <p className="mt-4 text-muted-foreground">
                Access control is applied at the data and API layer, not only in the user interface. Every sensitive
                action creates an immutable audit event.
              </p>
            </div>
            <div className="mt-16 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left font-medium">Role</th>
                    <th className="pb-3 text-left font-medium">View rights</th>
                    <th className="pb-3 text-left font-medium">Change rights</th>
                    <th className="pb-3 text-left font-medium">Export rights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rbacRows.map((row) => (
                    <tr key={row.role}>
                      <td className="py-4 font-medium">{row.role}</td>
                      <td className="py-4 text-muted-foreground">{row.view}</td>
                      <td className="py-4 text-muted-foreground">{row.change}</td>
                      <td className="py-4 text-muted-foreground">{row.export}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="mt-12 w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="text-left font-semibold">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <Card className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to replace your paper register?</h2>
              <p className="max-w-2xl text-muted-foreground">
                Book a free Paper Register Exposure Review and see exactly where your current process exposes personal
                information, and what a governed alternative looks like.
              </p>
              <Button asChild size="lg">
                <Link href="/contact">Book a Review</Link>
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
                  <Image src="/icon.png" alt="Buffr Checkpoint" width={24} height={24} className="rounded-md" />
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
