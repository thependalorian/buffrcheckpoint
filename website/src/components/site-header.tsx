import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
  { href: "/developers", label: "Developers" },
  { href: "/about", label: "About" },
  { href: "/status", label: "Status" },
  { href: "/contact", label: "Contact" },
] as const;

export type SiteHeaderActivePath = (typeof navItems)[number]["href"] | "/" | null;

// Was duplicated verbatim across all 7 public pages (page.tsx, about,
// contact, pricing, platform, privacy, terms) — one shared header instead
// of seven copies to keep in sync by hand. Opaque white, not the
// translucent/blurred dark-canvas-era bg-background/80 — the real brand
// (Section 11.5's v0.5 correction) is a white-canvas identity, so the nav
// should read as a clean white bar, not a frosted panel. Wordmark text
// dropped next to the icon — the icon alone, larger, is the mark; pairing
// it with a redundant text label was never how the actual logo asset
// presents it.
export function SiteHeader({ active, ctaLabel = "Get in Touch" }: { active: SiteHeaderActivePath; ctaLabel?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/icon.png"
            alt="Buffr Checkpoint"
            width={48}
            height={48}
            className="rounded-lg"
            style={{ height: "auto" }}
            priority
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild size="sm">
            <Link href="/contact">{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
