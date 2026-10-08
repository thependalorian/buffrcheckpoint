import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "cn";

type Variant = "primary" | "secondary" | "ink";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-border bg-card text-foreground hover:bg-muted",
  ink: "bg-[var(--color-carbon)] text-[var(--color-pure-white)] hover:opacity-90",
};

/** The one marketing button: 44 px target, visible focus ring, three variants. Use for every call to action. */
export function MarketingCta({
  href,
  variant = "primary",
  external = false,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  /** Plain anchor for links that leave this site (the admin sign-up). */
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    VARIANT[variant],
    className,
  );
  return external ? (
    <a href={href} className={classes}>
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
