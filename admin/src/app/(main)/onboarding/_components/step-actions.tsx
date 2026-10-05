"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { blockerText, onboardingCopy } from "@/lib/copy/onboarding";
import { AnalyticsEvents, track } from "@/lib/observability/track";
import { type EvidenceActionStep, elapsedSeconds, type LaunchRoute } from "@/lib/onboarding/readiness";

import { rememberConflict } from "./conflict-notice";

interface StepResponse {
  error?: string;
  code?: string;
  missingEvidence?: string[];
  changedBy?: string | null;
  status?: string;
  complete?: boolean;
}

/**
 * One in-flight checklist write at a time. A 409 is never shown raw: the
 * user returns to the refreshed readiness home with a "changed by" notice.
 */
export function useStepWrite(startedAt: string) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body: Record<string, string>): Promise<StepResponse | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as StepResponse;
      if (response.status === 409) {
        rememberConflict(result.changedBy ?? null);
        router.push("/onboarding");
        router.refresh();
        return null;
      }
      if (!response.ok) {
        setError(result.error ?? onboardingCopy.genericError);
        return {
          ...result,
          error: result.error ?? onboardingCopy.genericError,
          missingEvidence: result.missingEvidence ?? [],
        };
      }
      return result;
    } catch {
      setError(onboardingCopy.genericError);
      return null;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { post, pending, error, setError, router, elapsed: () => elapsedSeconds(startedAt) };
}

/** Error panel for a failed save, placed where the user is already looking (§11.9.15.5). */
export function SaveError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm"
    >
      {message}
    </p>
  );
}

/** Completing these steps is a north-star milestone (§11.9.15.11). */
const MILESTONES: Record<string, string> = {
  site_hierarchy: AnalyticsEvents.onboardingFirstSite,
  check_in_channels: AnalyticsEvents.onboardingFirstQr,
};

export function CompleteStepButton({
  stepCode,
  initialMissing,
  startedAt,
  launchRoute,
}: {
  stepCode: string;
  initialMissing: string[];
  startedAt: string;
  launchRoute: LaunchRoute | null;
}) {
  const { post, pending, error, router, elapsed } = useStepWrite(startedAt);
  const [missing, setMissing] = useState<string[]>(initialMissing);

  useEffect(() => setMissing(initialMissing), [initialMissing]);

  async function handleComplete() {
    const result = await post("/api/onboarding/complete-step", { stepCode });
    if (!result) return;
    if (result.error) {
      const blockers = result.missingEvidence ?? [];
      setMissing(blockers);
      track(AnalyticsEvents.onboardingStepBlocked, {
        step_code: stepCode,
        blocker_key: blockers[0] ?? result.code ?? "unknown",
        missing_count: blockers.length,
        launch_route: launchRoute ?? "none",
        elapsed_seconds: elapsed(),
      });
      return;
    }
    track(AnalyticsEvents.onboardingStepCompleted, {
      step_code: stepCode,
      launch_route: launchRoute ?? "none",
      elapsed_seconds: elapsed(),
    });
    const milestone = MILESTONES[stepCode];
    if (milestone) track(milestone, { launch_route: launchRoute ?? "none", elapsed_seconds: elapsed() });
    if (result.complete || result.status === "live") {
      track(AnalyticsEvents.onboardingLive, { launch_route: launchRoute ?? "none", elapsed_seconds: elapsed() });
      router.push("/dashboard/overview");
    } else {
      router.push("/onboarding");
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {missing.length > 0 ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">{onboardingCopy.stillNeeded}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {missing.map((item) => (
              <li key={item}>{blockerText(item)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <SaveError message={missing.length > 0 ? null : error} />
      <Button className="min-h-11" onClick={handleComplete} disabled={pending || missing.length > 0}>
        {pending ? onboardingCopy.completing : onboardingCopy.markComplete}
      </Button>
    </div>
  );
}

export function SkipStepButton({ stepCode, startedAt }: { stepCode: string; startedAt: string }) {
  const { post, pending, error, router, elapsed } = useStepWrite(startedAt);

  async function handleSkip() {
    const result = await post("/api/onboarding/skip-step", { stepCode });
    if (!result || result.error) return;
    track(AnalyticsEvents.onboardingStepSkipped, { step_code: stepCode, elapsed_seconds: elapsed() });
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <SaveError message={error} />
      <Button className="min-h-11" variant="ghost" onClick={handleSkip} disabled={pending}>
        {pending ? onboardingCopy.skipping : onboardingCopy.skip}
      </Button>
    </div>
  );
}

const EVIDENCE_ACTION_PATHS: Record<EvidenceActionStep, string> = {
  role_training: "/api/onboarding/training-acknowledgement",
};

/** Records the evidence a step needs (the launch acknowledgement) without leaving the step. */
export function EvidenceActionButton({ stepCode, startedAt }: { stepCode: EvidenceActionStep; startedAt: string }) {
  const { post, pending, error, router } = useStepWrite(startedAt);
  const clientId = useRef<string | null>(null);
  const [done, setDone] = useState(false);
  const copy = onboardingCopy.evidenceActions[stepCode];

  async function handleClick() {
    clientId.current ??= crypto.randomUUID();
    const result = await post(EVIDENCE_ACTION_PATHS[stepCode], { id: clientId.current });
    if (!result || result.error) return;
    setDone(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <SaveError message={error} />
      {done ? <p className="text-sm">{copy.done}</p> : null}
      <Button className="min-h-11" variant="outline" onClick={handleClick} disabled={pending || done}>
        {pending ? copy.pending : copy.label}
      </Button>
    </div>
  );
}

const NAV_CLICK_KEY = "bc_onboarding_nav_click";

/** Records when an onboarding link is clicked, so the next page can report click-to-render time. */
export function NavigationTimer() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href^='/onboarding']");
      if (!link) return;
      try {
        window.sessionStorage.setItem(NAV_CLICK_KEY, String(Date.now()));
      } catch {
        // Storage disabled: timing is best-effort.
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}

function reportNavigationTime(stepCode: string): void {
  try {
    const clicked = Number(window.sessionStorage.getItem(NAV_CLICK_KEY));
    window.sessionStorage.removeItem(NAV_CLICK_KEY);
    if (clicked > 0) {
      track(AnalyticsEvents.onboardingNavigationMs, { step_code: stepCode, duration_ms: Date.now() - clicked });
    }
  } catch {
    // Storage disabled: timing is best-effort.
  }
}

export function StepViewTracker({ stepCode, startedAt }: { stepCode: string; startedAt: string }) {
  useEffect(() => {
    reportNavigationTime(stepCode);
    const elapsed = elapsedSeconds(startedAt);
    track(AnalyticsEvents.onboardingStepViewed, { step_code: stepCode, elapsed_seconds: elapsed });
    const startedKey = `bc_onboarding_started:${startedAt}`;
    try {
      if (!window.localStorage.getItem(startedKey)) {
        window.localStorage.setItem(startedKey, "1");
        track(AnalyticsEvents.onboardingStarted, { elapsed_seconds: elapsed });
      }
    } catch {
      // Storage disabled: the started event is best-effort.
    }
  }, [stepCode, startedAt]);
  return null;
}

const HEARTBEAT_MS = 20_000;

/** Tells other administrators this step is being edited (advisory only, §11.9.15.9). */
export function PresenceHeartbeat({ stepCode }: { stepCode: string }) {
  useEffect(() => {
    const beat = () => {
      fetch("/api/onboarding/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepCode }),
      }).catch(() => undefined);
    };
    beat();
    const timer = window.setInterval(beat, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [stepCode]);
  return null;
}

export function OpenConfigLink({ href, label = onboardingCopy.openConfig }: { href: string; label?: string }) {
  return (
    <Button asChild variant="outline" className="min-h-11">
      <Link href={href} prefetch={false}>
        {label}
      </Link>
    </Button>
  );
}
