import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/me";
import {
  STEP_SLUG_TO_CODE,
  onboardingCopy,
  type OnboardingStepSlug,
} from "@/lib/copy/onboarding";

import { nextOnboardingHref, OnboardingProgress } from "../_components/progress";
import { CompleteStepButton, OpenConfigLink } from "../_components/step-actions";

const VALID_SLUGS = new Set(Object.keys(STEP_SLUG_TO_CODE));

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!VALID_SLUGS.has(step)) {
    notFound();
  }
  const slug = step as OnboardingStepSlug;
  const stepCode = STEP_SLUG_TO_CODE[slug];
  const copy = onboardingCopy.steps[stepCode];
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/login");
  }

  const completedSteps = currentUser.onboarding?.completedSteps ?? [];
  const secondaryHref = "secondaryHref" in copy ? copy.secondaryHref : undefined;
  const secondaryLabel = "secondaryLabel" in copy ? copy.secondaryLabel : onboardingCopy.openSecondary;

  return (
    <div className="flex flex-col gap-6">
      <OnboardingProgress currentSlug={slug} completedSteps={completedSteps} />
      <section className="space-y-4 rounded-lg border p-6">
        <div className="space-y-2">
          <h2 className="font-heading text-xl">{copy.title}</h2>
          <p className="text-muted-foreground text-sm">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {copy.href.startsWith("/onboarding") ? null : <OpenConfigLink href={copy.href} />}
          {secondaryHref ? <OpenConfigLink href={secondaryHref} label={secondaryLabel} /> : null}
          <CompleteStepButton stepCode={stepCode} nextHref={nextOnboardingHref(slug)} />
        </div>
      </section>
    </div>
  );
}
