import type { ReactNode } from "react";

import { cn } from "cn";

export type StatusTone = "success" | "warning" | "danger" | "info";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bc-status-success",
  warning: "bc-status-warning",
  danger: "bc-status-danger",
  info: "bc-status-info",
};

const DOT_CLASS: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/** The one status chip: soft tint, ink text, hairline border, optional dot. Tokens come from buffr-checkpoint.css. */
export function StatusChip({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("bc-status", TONE_CLASS[tone], className)}>
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASS[tone])} /> : null}
      {children}
    </span>
  );
}
