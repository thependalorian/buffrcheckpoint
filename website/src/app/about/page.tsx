import Image from "next/image";
import Link from "next/link";

import { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "About",
  description:
    "Buffr Checkpoint is built in Namibia, for Africa's compliance future. Learn about our founding mission to replace paper registers with secure, inclusive digital visitor management.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky top nav */}
      <SiteHeader active={"/about"} ctaLabel="Get in Touch" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-3xl">
              <Badge variant="outline" className="mb-6">
                About Buffr Checkpoint
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Built for Africa's Compliance.</h1>
              <p className="mt-6 text-lg text-muted-foreground">
                We started with a simple observation: the paper visitor register is an everyday privacy and governance
                failure. Buffr Checkpoint fixes that for every visitor, at every site, regardless of the device in their
                pocket.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Mission</h2>
              <div className="mt-8 space-y-6 text-muted-foreground">
                <p>
                  A paper visitor register exposes personal information (names, phone numbers, identification numbers,
                  employers, hosts, vehicle registrations, and visit purposes) to every person who signs the page
                  afterwards. It creates no reliable access history, can't enforce retention, can't support a
                  data-subject request, and can't demonstrate who viewed or removed information.
                </p>
                <p>
                  Buffr Checkpoint replaces shared paper registers with isolated visitor records, risk-based identity
                  and access controls, and encrypted records with retention automation and audit evidence.
                </p>
                <p>
                  The strategic choice is simple: <strong>NFC-forward, not NFC-exclusive.</strong>
                  Feature-phone users, visitors without e-ID, people without a phone, and people who cannot use a
                  self-service kiosk must still be able to check in securely and with dignity.
                </p>
                <p>
                  Whether a visitor carries a smartphone, a feature phone, or no phone at all, Buffr Checkpoint has a
                  secure channel for them. That sentence is our governing design constraint, and every section of our
                  architecture is written to keep it true.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What We Stand For</h2>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="flex flex-col p-6">
                <h3 className="text-lg font-semibold">Privacy by design</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Isolated records, data minimisation, and retention automation aren't afterthoughts. They're the
                  foundation.
                </p>
              </Card>
              <Card className="flex flex-col p-6">
                <h3 className="text-lg font-semibold">Inclusion first</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  USSD, SMS, assisted check-in, and offline operation are strategic necessities, not secondary features.
                </p>
              </Card>
              <Card className="flex flex-col p-6">
                <h3 className="text-lg font-semibold">Evidence-led</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Audit logs, evidence packs, and retention proof turn visitor management into defensible governance
                  infrastructure.
                </p>
              </Card>
              <Card className="flex flex-col p-6">
                <h3 className="text-lg font-semibold">Offline-resilient</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Connectivity fails. Buffr Checkpoint keeps working with an encrypted local cache and sync queue, so no
                  data is lost.
                </p>
              </Card>
              <Card className="flex flex-col p-6">
                <h3 className="text-lg font-semibold">Risk-based</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The level of identity assurance matches the risk of the site, visit, and zone. No over-collection. No
                  under-protection.
                </p>
              </Card>
              <Card className="flex flex-col p-6">
                <h3 className="text-lg font-semibold">Namibia-ready</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  CRAN-aware device governance, DigiNam/NPKI integration pathway, and public-sector procurement
                  readiness built in from day one.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <Card className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                See the paper-register risk for yourself.
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Book a free Paper Register Exposure Review. We'll show you exactly where your current process exposes
                personal information, and what a governed alternative looks like.
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
