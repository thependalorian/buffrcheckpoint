import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { getSessionGate } from "@/lib/auth/me";
import {
  blockerFix,
  blockerText,
  type OnboardingStepSlug,
  onboardingCopy,
  STEP_SLUG_TO_CODE,
} from "@/lib/copy/onboarding";
import { deriveStatus, OWNER_STEPS, type Readiness } from "@/lib/onboarding/readiness";

import { OnboardingProgress } from "../_components/progress";
import {
  CompleteStepButton,
  OpenConfigLink,
  PresenceHeartbeat,
  SkipStepButton,
  StepViewTracker,
} from "../_components/step-actions";

const VALID_SLUGS = new Set(Object.keys(STEP_SLUG_TO_CODE));

/** One template for every step (§11.9.15.4): why, what you will need, what done means, then the task. */
export default async function OnboardingStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!VALID_SLUGS.has(step)) {
    notFound();
  }
  const gate = await getSessionGate();
  if (!gate) redirect("/auth/login");
  if (!gate.canManageOnboarding) redirect("/onboarding/waiting");

  const stepCode = STEP_SLUG_TO_CODE[step as OnboardingStepSlug];
  // The owner's three steps, and the launch acknowledgement that is part of going live, live on the Setup home. A bookmark or an old
  // link to one of their old pages lands there instead of on a second, competing screen for the same action.
  if ((OWNER_STEPS as readonly string[]).includes(stepCode) || stepCode === "role_training") redirect("/onboarding");
  const copy = onboardingCopy.steps[stepCode];
  const template = onboardingCopy.template;
  const readiness = await api.get<Readiness>("/auth/onboarding/readiness");
  const current = readiness.steps.find((item) => item.code === stepCode);
  if (!current) notFound();

  const status = deriveStatus(current);
  const route = readiness.launchRoute;
  const secondaryHref = "secondaryHref" in copy ? copy.secondaryHref : undefined;
  const secondaryLabel = "secondaryLabel" in copy ? copy.secondaryLabel : onboardingCopy.openSecondary;
  const optional = current.requirement === "recommended" || current.requirement === "conditional";
  const notApplicable = current.requirement === "not_applicable";
  const missing = current.missingEvidence;
  const editor = readiness.editing.find((entry) => entry.stepCode === stepCode);
  return (
    <div className="flex flex-col gap-6">
      <StepViewTracker stepCode={stepCode} startedAt={readiness.startedAt} />
      {status === "blocked" || notApplicable ? null : <PresenceHeartbeat stepCode={stepCode} />}
      <Link href="/onboarding" prefetch={false} className="text-sm underline underline-offset-4">
        {onboardingCopy.backToOnboarding}
      </Link>

      <section className="bc-panel space-y-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {onboardingCopy.overview.sections[current.requirement]}
          </p>
          <h1 className="bc-h-page">{copy.title}</h1>
          <p className="text-muted-foreground text-sm">{copy.description}</p>
        </div>

        {editor ? (
          <p role="status" className="rounded-md border px-3 py-2 text-sm">
            {onboardingCopy.editing(editor.email, copy.title.toLowerCase())}
          </p>
        ) : null}

        {status === "blocked" ? (
          <div className="space-y-3">
            <p className="font-medium text-sm">{template.blockedTitle(copy.title)}</p>
            <ul className="list-disc pl-5 text-muted-foreground text-sm">
              {current.blockedBy.map((key) => (
                <li key={key}>{blockerText(key)}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {current.blockedBy.map((key) => {
                const fix = blockerFix(key);
                return fix ? (
                  <Button key={key} asChild className="min-h-11">
                    <Link href={fix.href} prefetch={false}>
                      {fix.label}
                    </Link>
                  </Button>
                ) : null;
              })}
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/onboarding" prefetch={false}>
                  {onboardingCopy.backToOnboarding}
                </Link>
              </Button>
            </div>
          </div>
        ) : notApplicable ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{template.notNeededTitle}</p>
            <p className="text-muted-foreground">{"notNeeded" in copy ? copy.notNeeded : copy.description}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <h3 className="font-medium">{template.whatYouNeed}</h3>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {copy.whatYouNeed.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li>{copy.time}</li>
                </ul>
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-medium">{template.doneMeans}</h3>
                <p className="text-muted-foreground">{copy.doneMeans}</p>
              </div>
            </div>

            {current.state === "done" ? <p className="text-sm">{template.alreadyDone}</p> : null}
            {current.state === "skipped" ? <p className="text-sm">{template.skipped}</p> : null}

            <div className="flex flex-wrap items-start gap-3">
              {copy.href.startsWith("/onboarding") ? null : <OpenConfigLink href={copy.href} />}
              {secondaryHref && (route === "kiosk" || stepCode !== "check_in_channels") ? (
                <OpenConfigLink href={secondaryHref} label={secondaryLabel} />
              ) : null}
              {current.state === "done" ? null : (
                <CompleteStepButton
                  stepCode={stepCode}
                  initialMissing={missing}
                  startedAt={readiness.startedAt}
                  launchRoute={route}
                />
              )}
              {optional && current.state === "todo" ? (
                <SkipStepButton stepCode={stepCode} startedAt={readiness.startedAt} />
              ) : null}
            </div>
          </>
        )}
      </section>

      <OnboardingProgress steps={readiness.steps} currentCode={stepCode} />
    </div>
  );
}
