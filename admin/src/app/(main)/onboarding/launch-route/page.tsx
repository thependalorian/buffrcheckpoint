import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { getSessionGate } from "@/lib/auth/me";
import { blockerFix, blockerText, onboardingCopy } from "@/lib/copy/onboarding";
import type { Readiness } from "@/lib/onboarding/readiness";

import { StepViewTracker } from "../_components/step-actions";
import { RouteChooser } from "./route-chooser";

const SETUP_CLOSED = new Set(["ready_for_golive", "live", "suspended"]);

/** The launch route is a decision with consequences, asked once a site exists (§11.9.15.2). */
export default async function LaunchRoutePage() {
  const gate = await getSessionGate();
  if (!gate) redirect("/auth/login");
  if (!gate.canManageOnboarding) redirect("/onboarding/waiting");

  const readiness = await api.get<Readiness>("/auth/onboarding/readiness");
  const copy = onboardingCopy.launchRoute;
  const blockedBy = readiness.steps.find((step) => step.code === "launch_route")?.blockedBy ?? [];

  return (
    <div className="flex flex-col gap-6">
      <StepViewTracker stepCode="launch_route" startedAt={readiness.startedAt} />
      <Link href="/onboarding" prefetch={false} className="text-sm underline underline-offset-4">
        {onboardingCopy.backToOnboarding}
      </Link>
      <div className="space-y-2">
        <h2 className="font-heading text-xl">{copy.title}</h2>
        <p className="text-muted-foreground text-sm">{copy.description}</p>
      </div>
      {blockedBy.length > 0 ? (
        <section className="bc-panel space-y-3">
          <p className="font-medium text-sm">
            {onboardingCopy.template.blockedTitle(onboardingCopy.steps.launch_route.title)}
          </p>
          <ul className="list-disc pl-5 text-muted-foreground text-sm">
            {blockedBy.map((key) => (
              <li key={key}>{blockerText(key)}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            {blockedBy.map((key) => {
              const fix = blockerFix(key);
              return fix ? (
                <Button key={key} asChild className="min-h-11">
                  <Link href={fix.href} prefetch={false}>
                    {fix.label}
                  </Link>
                </Button>
              ) : null;
            })}
          </div>
        </section>
      ) : (
        <RouteChooser
          current={readiness.launchRoute}
          locked={SETUP_CLOSED.has(readiness.status ?? "")}
          startedAt={readiness.startedAt}
        />
      )}
    </div>
  );
}
