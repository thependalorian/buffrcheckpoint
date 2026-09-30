"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { AnalyticsEvents, track } from "@/lib/observability/track";

export function CompleteStepButton({
  stepCode,
  nextHref,
}: {
  stepCode: string;
  nextHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetch(`/api/onboarding/evidence?step=${encodeURIComponent(stepCode)}`)
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as { missingEvidence?: string[] };
        setMissing(result.missingEvidence ?? []);
      })
      .catch(() => undefined);
  }, [stepCode]);

  async function handleComplete() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/complete-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepCode }),
      });
      const result = await response.json();
      if (!response.ok) {
        const missingEvidence = Array.isArray(result.missingEvidence)
          ? result.missingEvidence
          : Array.isArray(result.error?.missingEvidence)
            ? result.error.missingEvidence
            : [];
        setMissing(missingEvidence);
        track(AnalyticsEvents.onboardingStepBlocked, {
          step_code: stepCode,
          missing_count: missingEvidence.length,
        });
        setError(
          typeof result.error === "string"
            ? result.error
            : result.message ?? "Could not complete this step — missing configuration evidence.",
        );
        return;
      }
      track(AnalyticsEvents.onboardingStepCompleted, { step_code: stepCode });
      if (result.complete || result.status === "live") {
        track(AnalyticsEvents.onboardingLive);
        router.push("/dashboard/overview");
      } else {
        router.push(nextHref);
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {missing.length > 0 ? (
        <ul className="list-disc pl-5 text-amber-700 text-sm dark:text-amber-300">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button onClick={handleComplete} disabled={submitting || missing.length > 0}>
        {submitting ? onboardingCopy.completing : onboardingCopy.markComplete}
      </Button>
    </div>
  );
}

export function OpenConfigLink({
  href,
  label = onboardingCopy.openConfig,
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button asChild variant="outline">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
