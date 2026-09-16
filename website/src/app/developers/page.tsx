import Link from "next/link";

import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Developers",
  description:
    "Buffr Checkpoint API overview, authentication model, and integration boundaries for customer engineering teams.",
};

const resources = [
  {
    title: "Core API",
    body: "REST API at api.buffrcheckpoint.com. Tenant-scoped JWTs, RBAC on every route, audit events on mutating calls.",
  },
  {
    title: "Webhooks and outbox",
    body: "Host notifications and delivery instructions are processed asynchronously. Integrators should not assume synchronous SMS or email delivery at check-in time.",
  },
  {
    title: "Kiosk and MDM",
    body: "Device provisioning, CRAN compliance evidence, and kiosk experience sync are customer-admin flows — not public self-service APIs.",
  },
  {
    title: "Regulated capabilities",
    body: "DigiNam, national e-ID NFC, and live USSD menus are capability-gated platform features. Org enablement alone cannot surface a capability the platform has not marked live.",
  },
];

export default function DevelopersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader active="/developers" ctaLabel="Contact engineering" />

      <main className="flex-1">
        <section className="border-b border-border/40 py-16">
          <div className="mx-auto max-w-3xl px-4 lg:px-6">
            <Badge variant="outline" className="mb-4">
              Integrations
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight">Developer overview</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Buffr Checkpoint is a three-surface product: marketing site, customer admin, and internal platform ops. Customer
              integrations run against the Core API with organisation-scoped credentials — never against platform-only routes.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl space-y-6 px-4 lg:px-6">
            {resources.map((item) => (
              <Card key={item.title} className="p-6">
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-muted-foreground text-sm">{item.body}</p>
              </Card>
            ))}
            <Separator />
            <p className="text-muted-foreground text-sm">
              Full OpenAPI publication and sandbox keys are provided during onboarding. For partnership or regulated integrations,
              use the contact form and reference your organisation and use case.
            </p>
            <Button asChild>
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
