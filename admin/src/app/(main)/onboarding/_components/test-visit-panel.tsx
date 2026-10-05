"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { AnalyticsEvents, track } from "@/lib/observability/track";
import type { LaunchRoute } from "@/lib/onboarding/readiness";

import { SaveError, useStepWrite } from "./step-actions";

export interface TestVisit {
  visitId: string;
  siteName: string;
  hostName: string;
  checkedIn: boolean;
}

export interface TestVisitTarget {
  siteName: string;
  hostName: string;
}

/**
 * Test arrival as a guided verification moment (§11.9.15.6): shows where the
 * test visitor will arrive, creates it, then proves it on the roster and lets
 * the owner check it out. It is the activation event, never a checkbox flip.
 */
export function TestVisitPanel({
  organisationName,
  initialVisit,
  target,
  startedAt,
  launchRoute,
}: {
  organisationName: string;
  initialVisit: TestVisit | null;
  target: TestVisitTarget | null;
  startedAt: string;
  launchRoute: LaunchRoute | null;
}) {
  const copy = onboardingCopy.testVisit;
  const { post, pending, error, setError, router, elapsed } = useStepWrite(startedAt);
  const clientId = useRef<string | null>(null);
  const [visit, setVisit] = useState<TestVisit | null>(initialVisit);
  const [checkingOut, setCheckingOut] = useState(false);

  async function create() {
    clientId.current ??= crypto.randomUUID();
    const result = (await post("/api/onboarding/test-visit", { id: clientId.current })) as
      | (TestVisit & {
          error?: string;
        })
      | null;
    if (!result || result.error) return;
    setVisit(result);
    // The visit is the step's evidence, so record the step too; the save button stays as the fallback.
    await fetch("/api/onboarding/complete-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepCode: "flow_tests" }),
    }).catch(() => undefined);
    if (!initialVisit) {
      track(AnalyticsEvents.onboardingFirstTestVisit, {
        launch_route: launchRoute ?? "none",
        elapsed_seconds: elapsed(),
      });
    }
    track(AnalyticsEvents.onboardingTestVisitCreated, {
      launch_route: launchRoute ?? "none",
      elapsed_seconds: elapsed(),
    });
    router.refresh();
  }

  async function checkOut() {
    if (!visit) return;
    setCheckingOut(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/test-visit/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: visit.visitId }),
      });
      if (!response.ok) {
        setError(copy.checkOutFailed);
        return;
      }
      setVisit({ ...visit, checkedIn: false });
      track(AnalyticsEvents.onboardingTestVisitCheckedOut, { elapsed_seconds: elapsed() });
      router.refresh();
    } catch {
      setError(copy.checkOutFailed);
    } finally {
      setCheckingOut(false);
    }
  }

  function startAnother() {
    clientId.current = null;
    setVisit(null);
  }

  const place = visit ?? target;

  return (
    <section className="space-y-4 rounded-md border px-4 py-4">
      <h3 className="font-heading text-lg">{copy.title}</h3>
      {place ? (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">{copy.intro}</p>
          <p className="font-medium">
            {organisationName} · {place.siteName} · {place.hostName}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{copy.noTarget}</p>
      )}

      {visit?.checkedIn ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{copy.createdTitle}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {copy.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {visit && !visit.checkedIn ? <p className="font-medium text-sm">{copy.checkedOut}</p> : null}

      <SaveError message={error} />

      <div className="flex flex-wrap gap-3">
        {!visit && place ? (
          <Button className="min-h-11" onClick={create} disabled={pending}>
            {pending ? copy.creating : copy.create}
          </Button>
        ) : null}
        {visit?.checkedIn ? (
          <>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/dashboard/front-desk" prefetch={false}>
                {copy.view}
              </Link>
            </Button>
            <Button variant="outline" className="min-h-11" onClick={checkOut} disabled={checkingOut}>
              {checkingOut ? copy.checkingOut : copy.checkOut}
            </Button>
          </>
        ) : null}
        {visit && !visit.checkedIn ? (
          <Button variant="ghost" className="min-h-11" onClick={startAnother}>
            {copy.another}
          </Button>
        ) : null}
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/onboarding" prefetch={false}>
            {onboardingCopy.backToOnboarding}
          </Link>
        </Button>
      </div>
    </section>
  );
}
