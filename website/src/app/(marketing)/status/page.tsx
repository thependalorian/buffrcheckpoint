import Link from "next/link";

import type { Metadata } from "next";

import {
  CapabilityStatusBadge,
  capabilityStatusLabel,
  fetchPublicCapabilityStatus,
} from "@/components/capability-status-badge";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { marketingListCard, marketingNarrowSection, marketingPageTitle } from "@/lib/marketing-layout";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";

export const metadata: Metadata = {
  title: "Status",
  description: "Current status of Checkpoint services and check-in features.",
};

const INFRA_ROWS = [
  { name: "Core API", status: "Operational", note: "Authenticated tenant APIs and public check-in endpoints." },
  { name: "Customer admin", status: "Operational", note: "Dashboard, devices, and visitor operations." },
  {
    name: "Kiosk sync",
    status: "Operational",
    note: "Experience sync; offline capture on device when connectivity drops.",
  },
];

export default async function StatusPage() {
  const caps = await fetchPublicCapabilityStatus();

  const capabilityRows = [
    { code: "nfc_badge_checkin" as const, label: "NFC badge check-in", status: caps.nfcBadgeCheckIn },
    { code: "ussd" as const, label: "USSD", status: caps.ussd },
    { code: "qr_invitation_checkin" as const, label: "QR invitation check-in", status: caps.qrInvitationCheckIn },
    { code: "sms_contact_confirmation" as const, label: "SMS contact confirmation", status: caps.smsContactConfirmation },
    { code: "cimso_innterchange" as const, label: "CiMSO INNterchange (PMS)", status: caps.cimsoInnterchange },
  ];

  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.status.src}
        backgroundAlt={MARKETING_HERO_IMAGES.status.alt}
        layout="intro"
      >
        <h1 className={marketingPageTitle}>Platform status</h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Current status of our services and check-in features. We send incidents and maintenance windows to your
          admin contacts and support tickets, so you will not find a public incident board here.
        </p>
      </MarketingHero>

      <section className="border-b border-border bg-card">
        <div className={`${marketingNarrowSection} space-y-4 py-12`}>
          <h2 className="font-heading text-xl font-medium text-foreground">Core services</h2>
          <ul className="space-y-3">
            {INFRA_ROWS.map((row) => (
              <li key={row.name} className={marketingListCard}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{row.name}</p>
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--color-status-live)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-status-live)_10%,transparent)] px-3 py-1 text-xs font-medium text-[var(--color-status-live)]">
                    {row.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{row.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-background">
        <div className={`${marketingNarrowSection} space-y-4 pb-20 pt-12`}>
          <h2 className="font-heading text-xl font-medium text-foreground">Product capabilities</h2>
          <p className="text-sm text-muted-foreground">
            Each label below reads from our live capability register when this page loads. We never hardcode them.
          </p>
          <ul className="space-y-3">
            {capabilityRows.map((row) => (
              <li key={row.code} className={`flex flex-wrap items-center justify-between gap-3 ${marketingListCard}`}>
                <div>
                  <p className="font-medium text-foreground">{row.label}</p>
                  <p className="text-sm text-muted-foreground">Register status: {capabilityStatusLabel(row.status)}</p>
                </div>
                <CapabilityStatusBadge capabilityCode={row.code} />
              </li>
            ))}
          </ul>
          <p className="pt-4 text-sm text-muted-foreground">
            Questions about enablement for your organisation?{" "}
            <Link href="/contact" className="text-[var(--color-sodium-yellow-ink)] hover:text-foreground">
              Contact us
            </Link>
            .
          </p>
        </div>
      </section>

      <MarketingPageClose page="status" />
    </>
  );
}
