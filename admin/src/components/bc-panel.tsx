import type { ReactNode } from "react";

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
  className,
}: {
  label: string;
  value: ReactNode;
  flagged?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bc-stat-tile min-w-0",
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
    </div>
  );
}

export function BcSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bc-surface min-w-0", className)}>{children}</div>;
}
