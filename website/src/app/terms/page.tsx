import Image from "next/image";
import Link from "next/link";

import { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Standard SaaS terms for Buffr Checkpoint, scoped to the customer role model and packaging tiers.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky top nav */}
      <SiteHeader active={null} ctaLabel="Get in Touch" />

      <main className="flex-1">
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-6">
            <Badge variant="outline" className="mb-6">
              Terms & Conditions
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Terms & Conditions</h1>
            <p className="mt-4 text-muted-foreground">Last updated: September 2026</p>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-6 space-y-12">
            <div>
              <h2 className="text-2xl font-bold">1. Agreement to Terms</h2>
              <p className="mt-4 text-muted-foreground">
                By accessing or using the Buffr Checkpoint platform, website, or services, you agree to be bound by
                these Terms & Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">2. Definitions</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">"Platform"</strong> means the Buffr Checkpoint visitor-management
                  software, including the admin application, kiosk application, and backend services.
                </li>
                <li>
                  <strong className="text-foreground">"Client"</strong> means the organisation that subscribes to the
                  Platform and is the data controller for visitor records.
                </li>
                <li>
                  <strong className="text-foreground">"Visitor"</strong> means any individual who checks in through the
                  Platform.
                </li>
                <li>
                  <strong className="text-foreground">"Services"</strong> means the Platform, support, training, and any
                  associated professional services.
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">3. Customer Role Model</h2>
              <p className="mt-4 text-muted-foreground">
                The client organisation is the data controller for all visitor data processed through the Platform.
                Buffr Checkpoint acts as the data processor, processing visitor data only in accordance with the
                client's instructions and the applicable data-protection framework. The client is responsible for its
                own legal obligations, including privacy notices, retention policies, and data-subject request handling.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">4. Subscription and Tiers</h2>
              <p className="mt-4 text-muted-foreground">
                Access to the Platform is provided under one of the following subscription tiers:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Checkpoint Core:</strong> single-site SME or office
                </li>
                <li>
                  <strong className="text-foreground">Checkpoint Professional:</strong> multi-site dashboard, host
                  notification, pre-registration, NFC phone-tap
                </li>
                <li>
                  <strong className="text-foreground">Checkpoint Verify:</strong> DigiNam verifier workflow, NFC badges,
                  visitor assurance levels
                </li>
                <li>
                  <strong className="text-foreground">Checkpoint Access:</strong> physical access-control integration,
                  contractor credentials, emergency roster
                </li>
                <li>
                  <strong className="text-foreground">Checkpoint Assurance:</strong> annual controls review, retention
                  test, evidence pack
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                Tier features and pricing are described on our{" "}
                <Link href="/pricing" className="text-sodium-yellow-ink hover:underline">
                  Pricing page
                </Link>
                .
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">5. Acceptable Use</h2>
              <p className="mt-4 text-muted-foreground">You agree not to:</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  Use the Platform for any unlawful purpose or in violation of any applicable laws or regulations.
                </li>
                <li>Attempt to gain unauthorised access to the Platform, its systems, or networks.</li>
                <li>Interfere with or disrupt the integrity or performance of the Platform.</li>
                <li>Use the Platform to process data beyond the scope of the agreed visitor-management purpose.</li>
                <li>Reverse-engineer, decompile, or attempt to extract the source code of the Platform.</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">6. Data Protection and Privacy</h2>
              <p className="mt-4 text-muted-foreground">
                Buffr Checkpoint is designed to support privacy, cybersecurity, retention, evidence, and
                operational-resilience controls. Each client remains responsible for its own legal obligations and
                configuration decisions. Please review our{" "}
                <Link href="/privacy" className="text-sodium-yellow-ink hover:underline">
                  Privacy Policy
                </Link>{" "}
                for details on how personal information is handled.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">7. Service Availability</h2>
              <p className="mt-4 text-muted-foreground">
                We strive to maintain high availability of the Platform, but do not guarantee uninterrupted access. The
                Platform is designed with offline-first operation for kiosk and tablet check-in, ensuring continuity
                during connectivity outages. Scheduled maintenance will be communicated in advance where practicable.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">8. Limitation of Liability</h2>
              <p className="mt-4 text-muted-foreground">
                To the maximum extent permitted by law, Buffr Checkpoint shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether
                incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses
                resulting from your use of the Platform.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">9. Governing Law</h2>
              <p className="mt-4 text-muted-foreground">
                These Terms & Conditions are governed by the laws of Namibia. Any disputes arising from these terms
                shall be subject to the exclusive jurisdiction of the Namibian courts.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">10. Changes to Terms</h2>
              <p className="mt-4 text-muted-foreground">
                We may update these Terms & Conditions from time to time. We will notify clients of material changes via
                email or through the Platform. Continued use of the Platform after changes become effective constitutes
                acceptance of the updated terms.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">11. Contact</h2>
              <p className="mt-4 text-muted-foreground">
                For questions about these Terms & Conditions, please contact us at{" "}
                <a href="mailto:legal@buffrcheckpoint.com" className="text-sodium-yellow-ink hover:underline">
                  legal@buffrcheckpoint.com
                </a>{" "}
                or through our{" "}
                <Link href="/contact" className="text-sodium-yellow-ink hover:underline">
                  contact page
                </Link>
                .
              </p>
            </div>
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
