"use client";

import { useState } from "react";

import { QrCodeImage } from "@/components/qr-code-image";
import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";
import type { LaunchRoute } from "@/lib/onboarding/readiness";

import { SaveError, useStepWrite } from "./step-actions";
import { type TestVisit, TestVisitPanel, type TestVisitTarget } from "./test-visit-panel";

/**
 * Step 1, the first win: the owner scans their own QR code and checks in as a visitor, or lets Checkpoint check in a test visitor.
 * Either way a real check-in lands on the Front Desk roster, which is the evidence the step needs.
 */
export function TryItPanel({
  qrUrl,
  done,
  visitSeen,
  organisationName,
  testVisit,
  testTarget,
  startedAt,
  launchRoute,
}: {
  qrUrl: string | null;
  done: boolean;
  /** A check-in already exists (from the phone or a test visitor) but the step is not yet confirmed. */
  visitSeen: boolean;
  organisationName: string;
  testVisit: TestVisit | null;
  testTarget: TestVisitTarget | null;
  startedAt: string;
  launchRoute: LaunchRoute | null;
}) {
  const copy = onboardingCopy.home.tryIt;
  const { post, pending, error, router } = useStepWrite(startedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedOnce, setRefreshedOnce] = useState(false);

  async function refresh() {
    setRefreshing(true);
    router.refresh();
    // router.refresh() has no completion signal; a short, bounded pause keeps the button honest without a spinner that never ends.
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    setRefreshing(false);
    setRefreshedOnce(true);
  }

  async function confirm() {
    const result = await post("/api/onboarding/complete-step", { stepCode: "flow_tests" });
    if (!result || result.error) return;
    router.refresh();
  }

  if (done) {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-medium">{copy.done}</p>
        <p className="text-muted-foreground">{copy.doneNote}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {qrUrl ? (
          <div className="bc-surface-inset shrink-0 self-start bg-white p-2">
            <QrCodeImage value={qrUrl} size={176} alt={copy.qrAlt} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{copy.noQr}</p>
        )}
        <div className="space-y-4 text-sm">
          {qrUrl ? (
            <Button asChild className="min-h-11">
              <a href={qrUrl} target="_blank" rel="noreferrer">
                {copy.openHere}
              </a>
            </Button>
          ) : null}
          {visitSeen ? (
            <div className="space-y-2">
              <p className="font-medium">{copy.saw}</p>
              <SaveError message={error} />
              <Button className="min-h-11" onClick={confirm} disabled={pending}>
                {pending ? copy.confirming : copy.confirm}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">{copy.afterScan}</p>
              <Button variant="outline" className="min-h-11" onClick={refresh} disabled={refreshing}>
                {refreshing ? copy.refreshing : copy.refresh}
              </Button>
              {refreshedOnce && !refreshing ? (
                <p role="status" className="text-muted-foreground">
                  {copy.noVisitYet}
                </p>
              ) : null}
            </div>
          )}
          <p className="text-muted-foreground text-xs">{copy.printHint}</p>
        </div>
      </div>

      <details className="bc-surface-inset px-4 py-3">
        <summary className="min-h-6 cursor-pointer font-medium text-sm">{copy.orTitle}</summary>
        <div className="pt-4">
          <TestVisitPanel
            embedded
            organisationName={organisationName}
            initialVisit={testVisit}
            target={testTarget}
            startedAt={startedAt}
            launchRoute={launchRoute}
          />
        </div>
      </details>
    </div>
  );
}
