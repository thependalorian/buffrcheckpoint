import type { ReactNode } from "react";

import { Check, ChevronDown } from "lucide-react";

import { onboardingCopy } from "@/lib/copy/onboarding";
import { cn } from "@/lib/utils";

/**
 * One of the owner's three steps, as an accordion item. The step to do next is open and marked with a soft fill; a finished step
 * collapses to its summary but stays one tap from review; the rest wait closed, so the page leads with one thing. Opening one
 * closes the others where the browser supports grouped details; where it does not, they simply stay as the owner left them.
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
    <details name="setup-steps" open={current} className="group bc-surface overflow-hidden">
      <summary
        className={cn(
          "flex min-h-16 cursor-pointer list-none items-center gap-4 px-5 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden",
          current && "bc-active-soft",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border font-medium text-sm",
            done && "border-primary bg-primary text-primary-foreground",
            current && !done && "border-foreground",
          )}
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="sr-only">{copy.stepLabel(number)}: </span>
          <h3 className="bc-h-section">{title}</h3>
          <span className="block text-muted-foreground text-sm">{done ? copy.done : time}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-5 border-t px-5 py-5 sm:pl-[4.25rem]">
        <p className="max-w-prose text-muted-foreground text-sm">{description}</p>
        {children}
      </div>
    </details>
  );
}
