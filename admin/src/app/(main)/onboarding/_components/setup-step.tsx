import type { ReactNode } from "react";

import { Check } from "lucide-react";

import { onboardingCopy } from "@/lib/copy/onboarding";
import { cn } from "@/lib/utils";

/**
 * One of the three steps on the Setup home. The number and the status are always visible, a finished step collapses to its summary
 * but stays open to review (dismissal is never destructive), and the step the owner should do next is marked.
 */
export function SetupStep({
  number,
  title,
  time,
  description,
  done,
  current,
  children,
}: {
  number: number;
  title: string;
  time: string;
  description: string;
  done: boolean;
  /** The step the owner should do next. */
  current: boolean;
  children: ReactNode;
}) {
  const copy = onboardingCopy.home;
  return (
    <section
      aria-labelledby={`setup-step-${number}`}
      className={cn("bc-panel space-y-4", current && "border-primary", done && "opacity-90")}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm",
            done && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {copy.stepLabel(number)}
            {done ? ` · ${copy.done}` : ` · ${time}`}
          </p>
          <h3 id={`setup-step-${number}`} className="font-heading text-lg">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </header>
      <div className="space-y-4 sm:pl-11">{children}</div>
    </section>
  );
}
