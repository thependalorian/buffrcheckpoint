import Link from "next/link";

import { onboardingCopy, STEP_CODE_TO_SLUG } from "@/lib/copy/onboarding";
import { deriveStatus, type ReadinessStep } from "@/lib/onboarding/readiness";
import { cn } from "@/lib/utils";

/**
 * Compact checklist strip for step pages. Every step stays visible with its
 * status, so nothing appears to vanish when the launch route changes.
 */
export function OnboardingProgress({ steps, currentCode }: { steps: ReadinessStep[]; currentCode: string }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((step, index) => {
        const current = step.code === currentCode;
        const status = deriveStatus(step);
        return (
          <li key={step.code}>
            <Link
              href={`/onboarding/${STEP_CODE_TO_SLUG[step.code]}`}
              prefetch={false}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm",
                current && "border-primary bg-primary/5",
                status !== "ready" && !current && "border-muted-foreground/30 text-muted-foreground",
                status === "not_needed" && "border-dashed",
              )}
            >
              <span className="font-mono text-xs">{index + 1}</span>
              <span className="min-w-0 flex-1">{onboardingCopy.steps[step.code].title}</span>
              {status === "ready" ? null : (
                <span className="text-xs">{onboardingCopy.overview.statusLabel[status]}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
