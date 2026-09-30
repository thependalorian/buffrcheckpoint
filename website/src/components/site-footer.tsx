import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { BRAND } from "@/lib/copy/brand";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/copy/contact";
import { MARKETING_SECONDARY_PRICING_CTA } from "@/lib/copy/signup";

const PRODUCT_LINKS = [
  { href: "/platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
  { href: "/status", label: "Status" },
  { href: "/developers", label: "Developers" },
] as const;

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

function FooterLinkGroup({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-foreground/80 transition-colors hover:text-[var(--color-sodium-yellow-ink)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-[var(--color-sodium-yellow)] bg-card">
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Link href="/" className="inline-flex items-center" aria-label={`${BRAND.productName} home`}>
              <BrandLogo size="lg" />
            </Link>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {BRAND.footerAttribution}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Visitor check-in for banks, clinics, government offices, and any site still running a paper register.
              Each visitor gets a private record. You get the audit trail.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="https://admin.buffrcheckpoint.com/auth/register"
                className="inline-flex w-fit items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Create account
              </a>
              <Link
                href={MARKETING_SECONDARY_PRICING_CTA.href}
                className="text-sm text-[var(--color-sodium-yellow-ink)] hover:text-foreground"
              >
                {MARKETING_SECONDARY_PRICING_CTA.label}
              </Link>
              <a
                href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {PUBLIC_CONTACT_EMAIL}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-12">
            <FooterLinkGroup title="Product" links={PRODUCT_LINKS} />
            <FooterLinkGroup title="Company" links={COMPANY_LINKS} />
          </div>
        </div>

        <div className="mt-8 space-y-2 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            © {year} {BRAND.footerAttribution} · A {BRAND.parentCompany} product · Windhoek, Namibia · Built for
            Africa&apos;s Compliance.
          </p>
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground/90">
            {BRAND.productName} supports privacy, retention, and operational-resilience controls. Each organisation remains
            responsible for its own legal obligations, configuration, and supervisory reporting.
          </p>
        </div>
      </div>
    </footer>
  );
}
