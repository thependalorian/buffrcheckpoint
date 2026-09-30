import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIG } from "@/config/app-config";

const CAPABILITIES = [
  "Isolated, encrypted visitor records",
  "Risk-based identity assurance matched to site and visit risk",
  "Offline-first check-in for low-connectivity sites",
  "Audit-ready evidence, retention, and role-based access",
];

// Website runs as a separate app/deploy from admin/ (Section 11.6.1) — the
// footer's "back to site" link needs an absolute URL, not a relative one.
// Falls back to the website's default local dev port; set
// NEXT_PUBLIC_WEBSITE_URL in production.
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3002";

// Shared by every auth card (sign in, create account, forgot password, ...)
// so the icon placement rule stays one decision, not one per page: the icon
// belongs centered on the card itself, never in the side hero panel — the
// hero panel is messaging/positioning, the card is the product's mark.
export function AuthCardHeader({ title, description }: { title: string; description: string }) {
  return (
    <CardHeader className="items-center text-center">
      <span className="mb-3 inline-flex items-center gap-3">
        <Image src="/icon.png" alt="" width={96} height={96} className="size-11 rounded-lg" priority />
        <span className="font-heading font-semibold text-2xl tracking-tight">{APP_CONFIG.name}</span>
      </span>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <div className="flex flex-1 items-stretch">
        {/* Brand panel — hidden below lg, since there's no room to keep the
            form comfortably readable alongside it on a narrow viewport. */}
        <div className="relative hidden w-full max-w-md flex-col justify-between overflow-hidden bg-secondary p-10 lg:flex">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/15" />
          </div>
          <span className="inline-flex items-center gap-3 font-heading font-semibold text-xl tracking-tight">
            <Image src="/icon.png" alt="" width={80} height={80} className="size-10 rounded-lg" />
            {APP_CONFIG.name}
          </span>
          <div className="space-y-6">
            <h1 className="text-balance font-heading font-light text-3xl leading-tight">
              Built for Africa&apos;s Compliance.
            </h1>
            <ul className="space-y-3 text-muted-foreground text-sm">
              {CAPABILITIES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground text-xs">
            Replacing shared paper registers with isolated, governed visitor records.
          </p>
        </div>

        <main className="flex min-w-0 flex-1 items-center justify-center p-4 sm:p-6">
          <div className="bc-surface w-full max-w-md p-1">{children}</div>
        </main>
      </div>

      <footer className="flex flex-col items-center gap-2 border-t p-6 text-muted-foreground text-xs sm:flex-row sm:justify-between">
        <Link href={WEBSITE_URL} className="hover:text-foreground">
          ← Back to buffrcheckpoint.com
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`${WEBSITE_URL}/privacy`} className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href={`${WEBSITE_URL}/terms`} className="hover:text-foreground">
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>
    </div>
  );
}
