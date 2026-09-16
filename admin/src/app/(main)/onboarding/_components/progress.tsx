import Link from "next/link";

import {
  STEP_CODE_TO_SLUG,
  STEP_SLUG_TO_CODE,
  onboardingCopy,
  type OnboardingStepSlug,
} from "@/lib/copy/onboarding";
import { cn } from "@/lib/utils";

const ORDERED_SLUGS = Object.keys(STEP_SLUG_TO_CODE) as OnboardingStepSlug[];

export function OnboardingProgress({
  currentSlug,
  completedSteps,
}: {
  currentSlug: OnboardingStepSlug;
  completedSteps: string[];
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ORDERED_SLUGS.map((slug, index) => {
        const code = STEP_SLUG_TO_CODE[slug];
        const done = completedSteps.includes(code);
        const current = slug === currentSlug;
        return (
          <li key={slug}>
            <Link
              href={`/onboarding/${slug}`}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm",
                current && "border-primary bg-primary/5",
                done && !current && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              <span className="font-mono text-xs">{index + 1}</span>
              <span>{onboardingCopy.steps[code].title}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function nextOnboardingHref(currentSlug: OnboardingStepSlug): string {
  const index = ORDERED_SLUGS.indexOf(currentSlug);
  const next = ORDERED_SLUGS[Math.min(index + 1, ORDERED_SLUGS.length - 1)];
  return `/onboarding/${next}`;
}

export { STEP_CODE_TO_SLUG, STEP_SLUG_TO_CODE, ORDERED_SLUGS };
