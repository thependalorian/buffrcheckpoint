import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "cn";

/** Flat hairline panel — Refero-inspired `bc-panel` from buffr-checkpoint.css. */
export function BcPanel({
  children,
  className,
  header,
}: {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}) {
  return (
    <div className={cn("bc-panel min-w-0", className)}>
      {header ? <div className="bc-panel-header">{header}</div> : null}
      {children}
    </div>
  );
}

/** ≤4 primary KPI strip (Refero dashboard clarity). */
export function BcStatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bc-stat-row", className)}>{children}</div>;
}

export function BcStatTile({
  label,
  value,
  flagged,
  icon,
  hint,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  flagged?: boolean;
  icon?: ReactNode;
  /** One line under the value, for context such as a period or a unit. */
  hint?: ReactNode;
  /** Makes the whole tile a link to the screen behind the number. */
  href?: string;
  className?: string;
}) {
  const tile = (
    <div
      className={cn(
        "bc-stat-tile min-w-0",
        href && "transition-colors group-hover:border-foreground/30",
        flagged && "border-[color-mix(in_srgb,var(--color-sodium-yellow)_45%,var(--color-frost))]",
        className,
      )}
    >
      {icon ? <div className="mb-3">{icon}</div> : null}
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-medium text-3xl tabular-nums leading-none tracking-tight",
          flagged && "text-[var(--color-sodium-yellow-ink)]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
  if (!href) return tile;
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-[var(--radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {tile}
    </Link>
  );
}

export function BcSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bc-surface min-w-0", className)}>{children}</div>;
}
