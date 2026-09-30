"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { BRAND } from "@/lib/copy/brand";
import { MARKETING_PRIMARY_CTA, MARKETING_SECONDARY_PRICING_CTA } from "@/lib/copy/signup";

const NAV = [
  { href: "/platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center" aria-label={`${BRAND.productName} home`}>
          <BrandLogo priority />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(pathname, item.href)
                  ? "bc-active-soft rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground"
                  : "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href={MARKETING_PRIMARY_CTA.href}
          className="hidden rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 md:inline-block"
        >
          {MARKETING_PRIMARY_CTA.label}
        </a>

        <details className="relative md:hidden">
          <summary
            className="cursor-pointer list-none rounded-md border border-border px-3 py-2 text-sm"
            aria-label="Open menu"
          >
            Menu
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-3 ring-1 ring-border">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={MARKETING_PRIMARY_CTA.href}
              className="mt-2 block rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              {MARKETING_PRIMARY_CTA.label}
            </a>
            <Link
              href={MARKETING_SECONDARY_PRICING_CTA.href}
              className="mt-1 block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              {MARKETING_SECONDARY_PRICING_CTA.label}
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
