import Link from "next/link";

import { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/copy/contact";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("terms");

export default function TermsPage() {
  return (
    <>
      <section className="border-b border-border/40 py-16 sm:py-20">
        <div className="mx-auto min-w-0 max-w-3xl px-4 sm:px-6 lg:px-8">
          <Badge variant="outline" className="mb-6">
            Terms & Conditions
          </Badge>
          <h1 className="font-heading text-3xl font-light tracking-tight sm:text-4xl lg:text-5xl">
            Terms & Conditions
          </h1>
          <p className="mt-4 text-muted-foreground">Last updated: October 2026</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto min-w-0 max-w-3xl space-y-12 break-words px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold">1. Agreement to Terms</h2>
            <p className="mt-4 text-muted-foreground">
              By accessing or using the Buffr Checkpoint platform, website, or services, you agree to be bound by these
              Terms & Conditions. If you do not agree to these terms, please do not use our services.
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
              The client organisation is the data controller for all visitor data processed through the Platform. Buffr
              Checkpoint acts as the data processor, processing visitor data only in accordance with the client's
              instructions and the applicable data-protection framework. Checkpoint provides the privacy notice,
              retention and disposal, data-subject request handling, and evidence as part of the Platform, switched on
              by default. The client decides who may see what, and which legal holds apply.
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-bold">4. Subscription and Tiers</h2>
            <p className="mt-4 text-muted-foreground">
              Access to the Platform is provided under one of the following subscription tiers, billed monthly or
              annually:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Checkpoint Site:</strong> single-site SME or office
              </li>
              <li>
                <strong className="text-foreground">Checkpoint Network:</strong> multi-site dashboard, host
                notification, pre-registration, NFC phone-tap
              </li>
              <li>
                <strong className="text-foreground">Checkpoint Assure:</strong> identity checks graded by site and visit
                risk, NFC badges, and DigiNam or e-ID verification where formally enabled for the organisation
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Optional capabilities beyond a subscription tier (for example physical access-control integration or a
              controls-review retainer) may be scoped in a separate commercial schedule. Details are available on
              request and are not part of the public pricing grid.
            </p>
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
              <li>Use the Platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
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
              operational-resilience controls, and runs them for the client from the start. Please review our{" "}
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
              To the maximum extent permitted by law, Buffr Checkpoint shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly
              or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of
              the Platform.
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-bold">9. Governing Law</h2>
            <p className="mt-4 text-muted-foreground">
              These Terms & Conditions are governed by the laws of Namibia. Any disputes arising from these terms shall
              be subject to the exclusive jurisdiction of the Namibian courts.
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
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="text-sodium-yellow-ink hover:underline">
                {PUBLIC_CONTACT_EMAIL}
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
    </>
  );
}
