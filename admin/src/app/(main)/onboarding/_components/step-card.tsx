import Link from "next/link";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { blockerFix, blockerText, onboardingCopy, STEP_CODE_TO_SLUG } from "@/lib/copy/onboarding";
import { deriveStatus, type LaunchRoute, type Readiness, type ReadinessStep } from "@/lib/onboarding/readiness";
import { cn } from "@/lib/utils";

/** One line of explanation under a card, so no status is ever shown without its reason. */
function cardNote(step: ReadinessStep, route: LaunchRoute | null): string | null {
  const stepCopy = onboardingCopy.steps[step.code];
  const status = deriveStatus(step);
  if (status === "blocked") {
    return `${onboardingCopy.overview.needsFirst} ${step.blockedBy.map(blockerText).join(" ")}`;
  }
  if (status === "not_needed" && step.state !== "skipped" && "notNeeded" in stepCopy) return stepCopy.notNeeded;
  if (status === "ready") return stepCopy.time;
  return null;
}

/** A readiness card with one of the four visible statuses (§11.9.15.3). Nothing is hidden or a dead end. */
export function StepCard({
  step,
  route,
  editing,
}: {
  step: ReadinessStep;
  route: LaunchRoute | null;
  editing: Readiness["editing"];
}) {
  const copy = onboardingCopy.overview;
  const stepCopy = onboardingCopy.steps[step.code];
  const status = deriveStatus(step);
  const note = cardNote(step, route);
  const editor = editing.find((entry) => entry.stepCode === step.code);
  const fix = status === "blocked" ? blockerFix(step.blockedBy[0] ?? "") : null;
  const action = step.state === "skipped" ? copy.status.skipped : copy.status[status];

  return (
    <div
      className={cn(
        "flex min-h-11 flex-col gap-2 rounded-md border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        status === "blocked" && "bg-muted/40",
        status === "not_needed" && "border-dashed",
      )}
    >
      <div className="min-w-0 space-y-1">
        <span className="flex items-center gap-2 font-medium">
          {status === "complete" ? <Check aria-hidden className="size-4 shrink-0" /> : null}
          <span className={cn(status === "blocked" && "text-muted-foreground")}>{stepCopy.title}</span>
          <span className="sr-only">{copy.statusLabel[status]}</span>
        </span>
        {note ? <span className="block text-muted-foreground text-xs">{note}</span> : null}
        {editor ? (
          <span className="block text-muted-foreground text-xs">
            {onboardingCopy.editing(editor.email, stepCopy.title.toLowerCase())}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status === "blocked" ? <Badge variant="outline">{copy.statusLabel.blocked}</Badge> : null}
        {fix ? (
          <Link href={fix.href} prefetch={false} className="font-medium underline underline-offset-4">
            {fix.label}
          </Link>
        ) : (
          <Link
            href={`/onboarding/${STEP_CODE_TO_SLUG[step.code]}`}
            prefetch={false}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md px-3 font-medium",
              status === "ready" ? "border" : "text-muted-foreground underline underline-offset-4",
            )}
          >
            {action}
          </Link>
        )}
      </div>
    </div>
  );
}
