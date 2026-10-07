import type { Metadata } from "next";

import { PUBLIC_CONTACT_EMAIL } from "@/lib/copy/contact";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { marketingCapabilityCard, marketingNarrowSection, marketingPageTitle } from "@/lib/marketing-layout";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";

export const metadata: Metadata = {
  title: "Developers",
  description:
    "Checkpoint API overview, authentication model, and integration boundaries for customer engineering teams.",
};

const resources = [
  {
    title: "Core API",
    body: "REST API at api.buffrcheckpoint.com. Tenant-scoped JWTs. RBAC on every route. Audit events on mutating calls.",
  },
  {
    title: "Webhooks and outbox",
    body: "Host notifications and delivery instructions are processed asynchronously. Do not expect SMS or email to go out inside the check-in request.",
  },
  {
    title: "Kiosk and MDM",
    body: "Device provisioning, CRAN compliance evidence, and kiosk experience sync are customer-admin flows, not public self-service APIs.",
  },
  {
    title: "Regulated capabilities",
    body: "NFC badges and SMS are capability-gated platform features. Switching one on for your organisation has no effect until the platform marks it live.",
  },
];

export default function DevelopersPage() {
  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.developers.src}
        backgroundAlt={MARKETING_HERO_IMAGES.developers.alt}
        layout="intro"
      >
        <h1 className={marketingPageTitle}>Developer overview</h1>
        <p className="mt-6 text-base text-muted-foreground sm:text-lg">
          Checkpoint is a three-surface product: marketing site, customer admin, and internal platform ops.
          Customer integrations run against the Core API with organisation-scoped credentials, never against
          platform-only routes.
        </p>
      </MarketingHero>

      <section className="bg-card">
        <div className={`${marketingNarrowSection} space-y-6`}>
          {resources.map((item) => (
            <div key={item.title} className={`min-w-0 ${marketingCapabilityCard}`}>
              <h2 className="font-heading text-lg font-medium text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            Full OpenAPI publication and sandbox keys are provided during onboarding. For partnership or regulated
            integrations, email {PUBLIC_CONTACT_EMAIL} with your organisation and use case.
          </p>
        </div>
      </section>

      <MarketingPageClose page="developers" />
    </>
  );
}
