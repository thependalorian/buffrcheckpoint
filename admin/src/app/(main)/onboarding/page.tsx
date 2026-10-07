import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { getSessionGate } from "@/lib/auth/me";
import { onboardingCopy } from "@/lib/copy/onboarding";
import {
  addLaterSteps,
  autoSteps,
  OWNER_STEPS,
  ownerProgress,
  type Readiness,
  type ReadinessStep,
  type StandardsSummary,
  showReorganisedNote,
} from "@/lib/onboarding/readiness";

import { ConflictNotice } from "./_components/conflict-notice";
import { GoLivePanel } from "./_components/go-live-panel";
import { SetupStep } from "./_components/setup-step";
import { StandardsPanel } from "./_components/standards-panel";
import { StepViewTracker } from "./_components/step-actions";
import { StepCard } from "./_components/step-card";
import type { TestVisit, TestVisitTarget } from "./_components/test-visit-panel";
import { TryItPanel } from "./_components/try-it-panel";

interface QrReference {
  qrTypeCode: string;
  payload: string | null;
}

/**
 * The Setup home. A new organisation arrives with a working check-in already built (a site, a first host, the standard check-in
 * form, the public QR, a visitor privacy notice and a retention period), so the owner does three things: try it, review the
 * standards, go live. What was done for them is listed and reviewable, and everything else waits under "Add later".
 */
export default async function OnboardingHomePage() {
  const gate = await getSessionGate();
  if (!gate) redirect("/auth/login");
  if (!gate.canManageOnboarding) redirect("/onboarding/waiting");

  const copy = onboardingCopy.home;

  // Make sure the defaults exist, then read the state. A failure here must not hide the page: the next load tries again.
  let defaultsFailed = false;
  try {
    await api.post("/onboarding/defaults", {});
  } catch {
    defaultsFailed = true;
  }

  const [readiness, standards, qrRows, testVisit] = await Promise.all([
    api.get<Readiness>("/auth/onboarding/readiness"),
    api.get<StandardsSummary>("/auth/onboarding/standards").catch(() => null),
    api.get<QrReference[]>("/site-qr-references").catch(() => [] as QrReference[]),
    api
      .get<{ visit: TestVisit | null; target: TestVisitTarget | null }>("/onboarding/test-visit")
      .catch(() => ({ visit: null, target: null })),
  ]);

  const stepOf = (code: string): ReadinessStep | undefined => readiness.steps.find((step) => step.code === code);
  const tryStep = stepOf("flow_tests");
  const standardsStep = stepOf("notices_retention");
  const tryDone = tryStep?.state === "done";
  const standardsDone = standardsStep?.state === "done";
  const publicQr = qrRows.find((row) => row.qrTypeCode === "public_site_checkin")?.payload ?? null;
  const progress = ownerProgress(readiness.steps);

  const owner = new Set<string>(OWNER_STEPS);
  // On the kiosk route a tablet's channels and device are also the owner's.
  const otherRequired = readiness.steps
    .filter((step) => step.requirement === "required" && !owner.has(step.code) && step.state !== "done")
    .map((step) => step.code);
  const done = autoSteps(readiness.steps);
  const doneAllGood = done.every((step) => step.state === "done");
  const later = addLaterSteps(readiness.steps);

  // The step to do next, so the page leads with one thing.
  const current = !tryDone ? "try" : !standardsDone ? "standards" : "golive";

  return (
    <div className="flex flex-col gap-6">
      <StepViewTracker stepCode="readiness_home" startedAt={readiness.startedAt} />
      <header className="space-y-2">
        <h2 className="font-heading text-xl tracking-tight">{copy.greeting(gate.organisationName)}</h2>
        <p className="max-w-2xl text-muted-foreground text-sm">{copy.intro}</p>
        <p className="font-medium text-sm" aria-live="polite">
          {copy.progress(progress.done, progress.total)}
        </p>
        {showReorganisedNote(readiness) ? (
          <p className="text-muted-foreground text-xs">{onboardingCopy.overview.reorganised}</p>
        ) : null}
      </header>

      <ConflictNotice />

      {defaultsFailed ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm"
        >
          {copy.setupFailed}
        </p>
      ) : null}

      <SetupStep
        number={1}
        title={copy.tryIt.title}
        time={copy.tryIt.time}
        description={copy.tryIt.description}
        done={tryDone}
        current={current === "try"}
      >
        <TryItPanel
          qrUrl={publicQr}
          done={tryDone}
          visitSeen={readiness.goLive.testArrivalDone}
          organisationName={gate.organisationName}
          testVisit={testVisit.visit}
          testTarget={testVisit.target}
          startedAt={readiness.startedAt}
          launchRoute={readiness.launchRoute}
        />
      </SetupStep>

      <SetupStep
        number={2}
        title={copy.standards.title}
        time={copy.standards.time}
        description={copy.standards.description}
        done={standardsDone}
        current={current === "standards"}
      >
        {standards ? (
          <StandardsPanel summary={standards} startedAt={readiness.startedAt} launchRoute={readiness.launchRoute} />
        ) : (
          <p className="text-muted-foreground text-sm">{copy.standards.notReady}</p>
        )}
      </SetupStep>

      <SetupStep
        number={3}
        title={copy.goLive.title}
        time={copy.goLive.time}
        description={copy.goLive.description}
        done={false}
        current={current === "golive"}
      >
        <GoLivePanel
          goLive={readiness.goLive}
          tryDone={tryDone}
          standardsDone={standardsDone}
          otherRequired={otherRequired}
          startedAt={readiness.startedAt}
          launchRoute={readiness.launchRoute}
        />
      </SetupStep>

      {otherRequired.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-heading text-base">{onboardingCopy.overview.sections.required}</h3>
          <ul className="grid gap-2">
            {readiness.steps
              .filter((step) => otherRequired.includes(step.code))
              .map((step) => (
                <li key={step.code}>
                  <StepCard step={step} route={readiness.launchRoute} editing={readiness.editing} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <details open={!doneAllGood} className="space-y-2">
        <summary className="cursor-pointer font-heading text-base">{copy.setUpForYou.title}</summary>
        <p className="pt-2 text-muted-foreground text-sm">{copy.setUpForYou.intro}</p>
        <ul className="grid gap-2 pt-2">
          {done.map((step) => (
            <li key={step.code}>
              <StepCard step={step} route={readiness.launchRoute} editing={readiness.editing} />
            </li>
          ))}
        </ul>
      </details>

      <section className="space-y-2">
        <h3 className="font-heading text-base">{copy.addLater.title}</h3>
        <p className="text-muted-foreground text-sm">{copy.addLater.intro}</p>
        <ul className="grid gap-2">
          {later.map((step) => (
            <li key={step.code}>
              <StepCard step={step} route={readiness.launchRoute} editing={readiness.editing} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {onboardingCopy.overview.route.label}
            </p>
            <p className="text-sm">
              {readiness.launchRoute
                ? onboardingCopy.overview.route.summary[readiness.launchRoute]
                : onboardingCopy.overview.route.notChosen}
            </p>
          </div>
          <Button asChild variant="outline" className="min-h-11 shrink-0">
            <Link href="/onboarding/launch-route" prefetch={false}>
              {onboardingCopy.overview.route.change}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
