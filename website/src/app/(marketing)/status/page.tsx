import Link from "next/link";

import type { Metadata } from "next";

import {
  CapabilityStatusBadge,
  capabilityStatusLabel,
  fetchPublicCapabilityStatus,
} from "@/components/capability-status-badge";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_PAGES } from "@/lib/copy/marketing";
import { marketingListCard, marketingNarrowSection, marketingPageTitle } from "@/lib/marketing-layout";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";
import { pageMetadata } from "@/lib/seo";
import { fetchServiceHealth, type ServiceState, STATE_LABEL } from "@/lib/status";

export const metadata: Metadata = pageMetadata("status");

/** Success only for a service that just answered; anything else is shown as a problem. Tones come from the status tokens. */
function serviceBadgeClass(state: ServiceState): string {
  return `bc-status ${state === "operational" ? "bc-status-success" : "bc-status-danger"}`;
}

export default async function StatusPage() {
  const [caps, services] = await Promise.all([fetchPublicCapabilityStatus(), fetchServiceHealth()]);

  const capabilityRows = [
    { code: "nfc_badge_checkin" as const, label: "NFC badge check-in", status: caps.nfcBadgeCheckIn },
    { code: "qr_invitation_checkin" as const, label: "QR invitation check-in", status: caps.qrInvitationCheckIn },
    {
      code: "sms_contact_confirmation" as const,
      label: "SMS contact confirmation",
      status: caps.smsContactConfirmation,
    },
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
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">{MARKETING_PAGES.status.lead}</p>
      </MarketingHero>

      <section className="border-b border-border bg-card">
        <div className={`${marketingNarrowSection} space-y-4 py-12`}>
          <h2 className="font-heading text-xl font-medium text-foreground">Core services</h2>
          <ul className="border-t border-border">
            {services.map((row) => (
              <li key={row.name} className={marketingListCard}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{row.name}</p>
                  <span className={serviceBadgeClass(row.state)}>{STATE_LABEL[row.state]}</span>
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
          <p className="text-sm text-muted-foreground">{MARKETING_PAGES.status.capsLead}</p>
          <ul className="border-t border-border">
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
