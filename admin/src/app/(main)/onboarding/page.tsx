import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { getSessionGate } from "@/lib/auth/me";
import { onboardingCopy, STEP_CODE_TO_SLUG } from "@/lib/copy/onboarding";
import {
  groupByRequirement,
  nextBestAction,
  type Readiness,
  showReorganisedNote,
  stepsToFirstCheckIn,
} from "@/lib/onboarding/readiness";

import { ConflictNotice } from "./_components/conflict-notice";
import { StepCard } from "./_components/step-card";
import { StepViewTracker } from "./_components/step-actions";

export default async function OnboardingOverviewPage() {
  const gate = await getSessionGate();
  if (!gate) redirect("/auth/login");
  if (!gate.canManageOnboarding) redirect("/onboarding/waiting");

  const readiness = await api.get<Readiness>("/auth/onboarding/readiness");
  const copy = onboardingCopy.overview;
  const route = readiness.launchRoute;
  const left = stepsToFirstCheckIn(readiness.steps);
  const next = nextBestAction(readiness);
  const nextCopy = next ? onboardingCopy.steps[next.code] : null;

  return (
    <div className="flex flex-col gap-6">
      <StepViewTracker stepCode="readiness_home" startedAt={readiness.startedAt} />
      <header className="space-y-1">
        <h2 className="font-heading text-xl tracking-tight">{copy.greeting(gate.organisationName)}</h2>
        <p className="text-muted-foreground text-sm">
          {route === "kiosk" ? copy.stepsLeftKiosk(left) : copy.stepsLeft(left)}
        </p>
        {showReorganisedNote(readiness) ? <p className="text-muted-foreground text-xs">{copy.reorganised}</p> : null}
      </header>

      <ConflictNotice />

      <section className="bc-panel flex flex-col gap-3 border-primary sm:flex-row sm:items-center sm:justify-between">
        {next && nextCopy ? (
          <>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">{copy.nextUp}</p>
              <h3 className="font-heading text-lg">{nextCopy.title}</h3>
              <p className="text-muted-foreground text-sm">
                {nextCopy.time} · {nextCopy.description}
              </p>
            </div>
            <Button asChild className="min-h-11 shrink-0">
              <Link href={`/onboarding/${STEP_CODE_TO_SLUG[next.code]}`} prefetch={false}>
                {copy.status.ready}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm">{copy.allRequiredDone}</p>
            <Button asChild className="min-h-11 shrink-0">
              <Link href="/onboarding/golive-approval" prefetch={false}>
                {onboardingCopy.steps.golive_approval.title}
              </Link>
            </Button>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">{copy.route.label}</p>
          <p className="font-medium text-sm">
            {route ? onboardingCopy.launchRoute.options[route].title : copy.route.notChosen}
          </p>
          {route ? <p className="text-muted-foreground text-sm">{copy.route.summary[route]}</p> : null}
        </div>
        <Button asChild variant="outline" className="min-h-11 shrink-0">
          <Link href="/onboarding/launch-route" prefetch={false}>
            {route ? copy.route.change : copy.route.choose}
          </Link>
        </Button>
      </section>

      {groupByRequirement(readiness.steps).map((group) => (
        <section key={group.requirement} className="space-y-2">
          <h3 className="font-heading text-base">{copy.sections[group.requirement]}</h3>
          <ul className="grid gap-2">
            {group.steps.map((step) => (
              <li key={step.code}>
                <StepCard step={step} route={route} editing={readiness.editing} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
