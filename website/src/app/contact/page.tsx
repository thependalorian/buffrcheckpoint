import Image from "next/image";
import Link from "next/link";

import { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Buffr Checkpoint for a Paper Register Exposure Review, pricing, or partnership enquiries.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky top nav */}
      <SiteHeader active={"/contact"} ctaLabel="Get in Touch" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-6">
                Contact Us
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Let's talk about your visitor process.</h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Whether you want a Paper Register Exposure Review, a pricing conversation, or a technical question
                answered, we're here.
              </p>
            </div>
          </div>
        </section>

        {/* Contact form + info */}
        <section className="border-b border-border/40 py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Form */}
              <Card className="p-6 md:p-8">
                <ContactForm />
              </Card>

              {/* Contact info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold">Direct contact</h2>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Email:</strong>{" "}
                      <a href="mailto:hello@buffrcheckpoint.com" className="text-sodium-yellow-ink hover:underline">
                        hello@buffrcheckpoint.com
                      </a>
                    </p>
                    <p>
                      <strong className="text-foreground">Phone:</strong>{" "}
                      <a href="tel:+264812345678" className="text-sodium-yellow-ink hover:underline">
                        +264 81 234 5678
                      </a>
                    </p>
                    <p>
                      <strong className="text-foreground">Address:</strong> Windhoek, Namibia
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold">What happens next?</h2>
                  <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-sodium-yellow-ink">
                        1
                      </span>
                      <span>We review your enquiry and confirm we understand your site context.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-sodium-yellow-ink">
                        2
                      </span>
                      <span>We schedule a 30-minute discovery call or site walkthrough.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-sodium-yellow-ink">
                        3
                      </span>
                      <span>We deliver a Paper Register Exposure Review or a tailored proposal.</span>
                    </li>
                  </ol>
                </div>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold">Sales and partnership</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    For reseller, hardware, or integration partnerships, use the same form above and mention the
                    partnership type in your message.
                  </p>
                </div>
              </div>
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
