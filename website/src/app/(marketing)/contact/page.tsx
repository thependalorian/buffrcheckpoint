import type { Metadata } from "next";

import { CONTACT_EMAIL_TOPICS, contactMailto, PUBLIC_CONTACT_EMAIL } from "@/lib/copy/contact";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { marketingFeatureCard, marketingPageTitle, marketingWideSection } from "@/lib/marketing-layout";
import { MarketingPageClose } from "@/components/marketing/marketing-page-close";
import { MARKETING_HERO_IMAGES } from "@/lib/marketing-visuals";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions before you sign up, multi-site rollouts, hardware, integrations, or partnerships with Checkpoint.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingHero
        backgroundSrc={MARKETING_HERO_IMAGES.contact.src}
        backgroundAlt={MARKETING_HERO_IMAGES.contact.alt}
        layout="intro"
      >
        <h1 className={marketingPageTitle}>Questions before you sign up?</h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Most organisations set themselves up: create an account, add your sites, and pay by EFT to go live. Write to
          us for multi-site rollouts, kiosk hardware, integrations, or anything the pricing page leaves open. Ready now?{" "}
          <a href="https://admin.buffrcheckpoint.com/auth/register" className="text-[var(--color-sodium-yellow-ink)] hover:text-foreground">
            Create an account
          </a>
          .
        </p>
      </MarketingHero>

      <section className="bg-background">
        <div className={marketingWideSection}>
          <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-medium text-foreground">Email us directly</h2>
              <ul className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2">
                {CONTACT_EMAIL_TOPICS.map((topic) => (
                  <li key={topic.subject} className={`flex min-w-0 flex-col ${marketingFeatureCard}`}>
                    <h3 className="font-heading text-base font-medium text-foreground">{topic.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{topic.body}</p>
                    <a
                      href={contactMailto(topic.subject, topic.prompt)}
                      className="mt-4 inline-flex w-fit items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Write an email
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <dl className="space-y-6 text-sm">
                <div>
                  <dt className="font-medium text-foreground">Email</dt>
                  <dd className="mt-1 break-words text-muted-foreground">
                    <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="hover:text-foreground">
                      {PUBLIC_CONTACT_EMAIL}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Location</dt>
                  <dd className="mt-1 text-muted-foreground">Windhoek, Namibia</dd>
                </div>
              </dl>

              <div className="mt-12">
                <h2 className="font-heading text-lg font-medium text-foreground">What happens next</h2>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li>1. We reply to your email within two business days.</li>
                  <li>2. Planning several sites or kiosks? We map your sites, hardware, and go-live dates with you.</li>
                  <li>3. You pick Site, Network, or Assure, pay by EFT from your account, and go live.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingPageClose page="contact" />
    </>
  );
}
