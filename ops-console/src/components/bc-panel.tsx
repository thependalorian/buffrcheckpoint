import type { ReactNode } from "react";

import { cn } from "cn";

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

export function BcStatRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bc-stat-row", className)}>{children}</div>;
}

export function BcStatTile({
  label,
  value,
  flagged,
  className,
}: {
  label: string;
  value: ReactNode;
  flagged?: boolean;
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
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading font-light text-3xl tabular-nums leading-none tracking-tight text-foreground",
          flagged && "text-[var(--color-sodium-yellow-ink)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
