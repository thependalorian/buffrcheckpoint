"use client";

import { useRef, useState } from "react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { blockerText, onboardingCopy } from "@/lib/copy/onboarding";
import { LEGAL_LINKS } from "@/lib/legal-links";
import { AnalyticsEvents, track } from "@/lib/observability/track";
import type { GoLiveBlock, LaunchRoute } from "@/lib/onboarding/readiness";

import { SaveError, useStepWrite } from "./step-actions";

type KybStatus = "none" | "pending" | "verified" | "rejected" | "expired";

function kybStatus(value: string): KybStatus {
  return value === "pending" || value === "verified" || value === "rejected" || value === "expired" ? value : "none";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{label}</p>
        {children}
      </div>
    </li>
  );
}

/**
 * Step 3: go live. What stands between the owner and go-live is shown here from the start, not discovered as a refusal at the end:
 * the plan, business verification (a human review by Buffr ops, needed only to activate a paid plan), and the agreements. One
 * confirmation then accepts anything pending, records the launch acknowledgement, and goes live.
 */
export function GoLivePanel({
  goLive,
  tryDone,
  standardsDone,
  otherRequired,
  startedAt,
  launchRoute,
}: {
  goLive: GoLiveBlock;
  tryDone: boolean;
  standardsDone: boolean;
  /** Required steps beyond the owner's three (a kiosk's channels and device), as step codes. */
  otherRequired: string[];
  startedAt: string;
  launchRoute: LaunchRoute | null;
}) {
  const copy = onboardingCopy.home.goLive;
  const { post, pending, error, router, elapsed } = useStepWrite(startedAt);
  const acknowledgementId = useRef<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(goLive.launchAcknowledged);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const planOk = goLive.subscription.operationalUseAllowed;
  const planStatus = goLive.subscription.status;
  const kyb = kybStatus(goLive.kyb.status);
  const legalPending = goLive.legalPending;
  const legalOk = legalPending.length === 0 || legalAccepted;

  const reasons: string[] = [];
  if (!tryDone) reasons.push(copy.tryFirst);
  if (!standardsDone) reasons.push(copy.standardsFirst);
  for (const code of otherRequired) reasons.push(blockerText(`step.${code}`));
  if (!planOk) reasons.push(copy.planFirst);
  if (!legalOk) reasons.push(copy.agreementsFirst);
  if (!acknowledged) reasons.push(copy.acknowledgeFirst);

  async function goLiveNow() {
    acknowledgementId.current ??= crypto.randomUUID();
    const result = await post("/api/onboarding/go-live", {
      acknowledgementId: acknowledgementId.current,
      acceptLegal: legalPending,
    });
    if (!result || result.error) return;
    track(AnalyticsEvents.onboardingLive, { launch_route: launchRoute ?? "none", elapsed_seconds: elapsed() });
    router.push("/dashboard/overview");
    router.refresh();
  }

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-2">
        <h4 className="font-medium">{copy.beforeTitle}</h4>
        <ul className="space-y-2">
          <Row label={copy.plan.label}>
            <p className="text-muted-foreground">
              {planOk
                ? planStatus === "trial"
                  ? copy.plan.trial
                  : copy.plan.active
                : planStatus
                  ? copy.plan.pending
                  : copy.plan.none}
            </p>
            {planOk ? null : (
              <Link
                href="/dashboard/billing"
                prefetch={false}
                className="inline-block font-medium underline underline-offset-4"
              >
                {copy.plan.open}
              </Link>
            )}
          </Row>
          <Row label={copy.kyb.label}>
            <p className="text-muted-foreground">{copy.kyb.why}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={kyb === "verified" ? "default" : "outline"}>{copy.kyb[kyb]}</Badge>
              <Link href="/dashboard/kyb" prefetch={false} className="font-medium underline underline-offset-4">
                {kyb === "none" || kyb === "rejected" || kyb === "expired" ? copy.kyb.send : copy.kyb.view}
              </Link>
            </div>
          </Row>
          <Row label={copy.agreements.label}>
            <p className="text-muted-foreground">
              {legalPending.length === 0 ? copy.agreements.ok : copy.agreements.pending}
            </p>
          </Row>
        </ul>
      </div>

      {legalPending.length > 0 ? (
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="golive-legal"
            checked={legalAccepted}
            onCheckedChange={(value) => setLegalAccepted(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="golive-legal" className="font-normal leading-snug">
            {copy.agreements.accept}{" "}
            <a href={LEGAL_LINKS.terms} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {copy.agreements.terms}
            </a>{" "}
            {copy.agreements.and}{" "}
            <a href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {copy.agreements.privacy}
            </a>
            .
          </Label>
        </div>
      ) : null}

      {goLive.launchAcknowledged ? (
        <p className="text-muted-foreground">{copy.acknowledged}</p>
      ) : (
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="golive-ack"
            checked={acknowledged}
            onCheckedChange={(value) => setAcknowledged(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="golive-ack" className="font-normal leading-snug">
            {copy.acknowledge}
          </Label>
        </div>
      )}

      {reasons.length > 0 ? (
        <div role="status" className="space-y-1">
          <p className="font-medium">{copy.stillNeeded}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">{copy.afterGoLive}</p>
      <SaveError message={error ? (error === onboardingCopy.genericError ? copy.failed : error) : null} />
      <Button className="min-h-11" onClick={goLiveNow} disabled={pending || reasons.length > 0}>
        {pending ? copy.acting : copy.action}
      </Button>
    </div>
  );
}
