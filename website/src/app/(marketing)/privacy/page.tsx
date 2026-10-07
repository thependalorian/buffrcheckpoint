import Link from "next/link";

import { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IDENTITY_ASSURANCE_LADDER_SUMMARY } from "@/lib/copy/identity-assurance";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Buffr Checkpoint collects, uses, stores, and protects personal information in accordance with Namibia's data-protection direction.",
};

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b border-border/40 py-16 sm:py-20">
          <div className="mx-auto min-w-0 max-w-3xl px-4 sm:px-6 lg:px-8">
            <Badge variant="outline" className="mb-6">
              Privacy Policy
            </Badge>
            <h1 className="font-heading text-3xl font-light tracking-tight sm:text-4xl lg:text-5xl">Privacy Policy</h1>
            <p className="mt-4 text-muted-foreground">Last updated: September 2026</p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto min-w-0 max-w-3xl space-y-12 break-words px-4 sm:px-6 lg:px-8">
            <div>
              <h2 className="text-2xl font-bold">1. Introduction</h2>
              <p className="mt-4 text-muted-foreground">
                Buffr Checkpoint is a digital visitor and access-management platform built in Namibia. This Privacy
                Policy explains how we collect, use, store, and protect personal information when you use our platform,
                website, or services.
              </p>
              <p className="mt-4 text-muted-foreground">
                This policy is grounded in Namibia's data-protection direction, the Electronic Transactions Act 4 of
                2019, and the principles of privacy by design and data minimisation that govern the Buffr Checkpoint
                architecture.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">2. Controller and Processor</h2>
              <p className="mt-4 text-muted-foreground">
                In the context of visitor records, the <strong className="text-foreground">client organisation</strong>{" "}
                (the bank, government office, healthcare facility, or other entity deploying Buffr Checkpoint) is the{" "}
                <strong className="text-foreground">data controller</strong>. Buffr Checkpoint acts as the{" "}
                <strong className="text-foreground">data processor</strong> on behalf of the client, processing visitor
                data only in accordance with the client's instructions and the applicable data-protection framework.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">3. Data We Collect</h2>
              <p className="mt-4 text-muted-foreground">
                Buffr Checkpoint collects only the minimum data necessary for the purpose of the visit. The exact fields
                depend on the visitor type, site configuration, and risk tier, but typically include:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Visitor name and contact reference (phone number, stored encrypted)</li>
                <li>Host or department</li>
                <li>Purpose category (not free-text by default)</li>
                <li>Check-in and check-out timestamps</li>
                <li>Capture channel (kiosk, NFC, QR, SMS, assisted)</li>
                <li>Identity assurance outcome ({IDENTITY_ASSURANCE_LADDER_SUMMARY})</li>
                <li>Verification outcome and reference (not full credential payload)</li>
                <li>Device and site identifiers</li>
                <li>Consent or acknowledgement record where required</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                National ID numbers, photos, health information, and biometric data are{" "}
                <strong className="text-foreground">disabled by default</strong> and require documented compliance
                approval before activation.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">4. How We Use Data</h2>
              <p className="mt-4 text-muted-foreground">
                Visitor data is used solely for the purpose of managing visitor access, notifying hosts, maintaining
                audit trails, and meeting retention and compliance obligations. We do not use visitor data for
                marketing, profiling, or any purpose unrelated to the visitor-management function.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">5. Data Retention and Deletion</h2>
              <p className="mt-4 text-muted-foreground">
                Retention periods are configured per site and visitor type, in accordance with the client's
                data-protection obligations. When a record reaches its retention threshold, it is either auto-deleted or
                flagged for legal hold if a hold is active.
              </p>
              <p className="mt-4 text-muted-foreground">
                Data-subject deletion requests (DSARs) are routed to the client's Compliance/Audit Officer, who verifies
                the requester's identity and authority before executing deletion or explaining a lawful exception. Every
                action is logged as an auditable event.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">6. Data Security</h2>
              <p className="mt-4 text-muted-foreground">
                Buffr Checkpoint implements encryption in transit (TLS) and at rest (database, object store, device
                cache, backups). Role-based access control (RBAC) runs at the data and API layer, with tenant and site
                scoping on every query.
              </p>
              <p className="mt-4 text-muted-foreground">
                Audit events are written for every sensitive read, export, correction, and deletion, forming an
                append-only, hash-linked chain that supports evidence-pack generation for regulators and auditors.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">7. Subprocessors</h2>
              <p className="mt-4 text-muted-foreground">We use the following categories of subprocessor:</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Hosting:</strong> Flexible deployment options, including
                  client-controlled private-cloud and on-premise deployments, per contract. Development and testing
                  environments may use offshore infrastructure with synthetic data only; production deployments are
                  scoped and confirmed per client.
                </li>
                <li>
                  <strong className="text-foreground">Messaging:</strong> Licensed MTC, Telecom Namibia, or approved
                  local aggregator for SMS.
                </li>
                <li>
                  <strong className="text-foreground">Identity:</strong> DigiNam/NPKI verifier, where formally enabled
                  by relying-party arrangement.
                </li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                A current subprocessor list is maintained in the client contract and updated as arrangements change.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">8. Cookies</h2>
              <p className="mt-4 text-muted-foreground">
                The Buffr Checkpoint website uses essential cookies for session management and theme preferences.
                Product analytics (PostHog EU) loads only after you accept the cookie banner. Crash reporting (Sentry)
                sends error diagnostics without visitor names or phone numbers. The admin application uses a session
                cookie strictly necessary for authentication; admin analytics cookies also require explicit consent.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">9. Your Rights</h2>
              <p className="mt-4 text-muted-foreground">
                Visitors have the right to request access to, correction of, or deletion of their personal data. Such
                requests should be directed to the client organisation (the data controller), who will process the
                request through the DSAR workflow in accordance with applicable law.
              </p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-bold">10. Contact</h2>
              <p className="mt-4 text-muted-foreground">
                For privacy-related enquiries, please contact us at{" "}
                <a href="mailto:privacy@buffrcheckpoint.com" className="text-sodium-yellow-ink hover:underline">
                  privacy@buffrcheckpoint.com
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
