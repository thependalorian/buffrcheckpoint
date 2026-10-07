import Link from "next/link";

import { Check, ChevronRight, CircleAlert, Clock } from "lucide-react";

import { onboardingCopy, STEP_CODE_TO_SLUG } from "@/lib/copy/onboarding";
import type { ReadinessStep } from "@/lib/onboarding/readiness";
import { cn } from "@/lib/utils";

/** Steps whose evidence the owner gives later (the launch acknowledgement, given at go-live). They are waiting, not broken. */
const GIVEN_AT_GO_LIVE = new Set<string>(["role_training"]);

type Mark = "done" | "attention" | "waiting" | "later";

function markFor(step: ReadinessStep): Mark {
  if (step.state === "done") return "done";
  return GIVEN_AT_GO_LIVE.has(step.code) ? "waiting" : "attention";
}

function RailRow({ step, mark }: { step: ReadinessStep; mark: Mark }) {
  const copy = onboardingCopy.home;
  const title = onboardingCopy.steps[step.code].title;
  return (
    <li>
      <Link
        href={`/onboarding/${STEP_CODE_TO_SLUG[step.code]}`}
        prefetch={false}
        className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-sm outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
          {mark === "done" ? <Check className="size-4" /> : null}
          {mark === "attention" ? <CircleAlert className="size-4 text-destructive" /> : null}
          {mark === "waiting" ? <Clock className="size-4 text-muted-foreground" /> : null}
        </span>
        <span className={cn("min-w-0 flex-1", mark === "later" && "text-muted-foreground")}>
          {title}
          {mark === "attention" ? (
            <span className="block text-destructive text-xs">{copy.setUpForYou.needsAttention}</span>
          ) : null}
          {mark === "waiting" ? (
            <span className="block text-muted-foreground text-xs">{onboardingCopy.steps[step.code].time}</span>
          ) : null}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/**
 * The side rail: what Checkpoint already did for the owner, and what can wait. Compact rows, not cards, so the owner's three steps
 * stay the focus. A step the system should have done but could not is marked, so nothing is silently wrong.
 */
export function SetupRail({ done, later }: { done: ReadinessStep[]; later: ReadinessStep[] }) {
  const copy = onboardingCopy.home;
  return (
    <aside
      className="flex flex-col gap-6 lg:col-span-4"
      aria-label={`${copy.setUpForYou.title} and ${copy.addLater.title}`}
    >
      {/* div, not section: the theme gives every section marketing-sized padding that a utility class cannot override. */}
      <div role="group" aria-labelledby="rail-done" className="bc-surface space-y-2 p-4">
        <h2 id="rail-done" className="bc-h-section px-2">
          {copy.setUpForYou.title}
        </h2>
        <p className="px-2 text-muted-foreground text-sm">{copy.setUpForYou.intro}</p>
        <ul className="pt-1">
          {done.map((step) => (
            <RailRow key={step.code} step={step} mark={markFor(step)} />
          ))}
        </ul>
      </div>
      <div role="group" aria-labelledby="rail-later" className="bc-surface space-y-2 p-4">
        <h2 id="rail-later" className="bc-h-section px-2">
          {copy.addLater.title}
        </h2>
        <p className="px-2 text-muted-foreground text-sm">{copy.addLater.intro}</p>
        <ul className="pt-1">
          {later.map((step) => (
            <RailRow key={step.code} step={step} mark="later" />
          ))}
        </ul>
      </div>
    </aside>
  );
}
