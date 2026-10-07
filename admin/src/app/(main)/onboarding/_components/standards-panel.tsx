"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";
import type { LaunchRoute, StandardsSummary } from "@/lib/onboarding/readiness";

import { SaveError, useStepWrite } from "./step-actions";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Windhoek",
  }).format(new Date(iso));
}

/**
 * Step 2: Checkpoint's standard notice, retention period and check-in form, shown as they stand. The owner accepts them as they are
 * or edits them first, now or just before go-live. Acceptance is recorded with a fingerprint of exactly what was accepted.
 */
export function StandardsPanel({
  summary,
  startedAt,
}: {
  summary: StandardsSummary;
  startedAt: string;
  launchRoute: LaunchRoute | null;
}) {
  const copy = onboardingCopy.home.standards;
  const { post, pending, error, router } = useStepWrite(startedAt);

  if (!summary.ready) return <p className="text-muted-foreground text-sm">{copy.notReady}</p>;

  async function accept() {
    const result = await post("/api/onboarding/standards", {});
    if (!result || result.error) return;
    router.refresh();
  }

  const { privacyNotice, retention, form } = summary;
  return (
    <div className="space-y-5 text-sm">
      <dl className="divide-y rounded-md border">
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="font-medium">{copy.notice}</dt>
            <dd>
              <Badge variant="outline">{privacyNotice?.isStandard ? copy.noticeStandard : copy.noticeEdited}</Badge>
            </dd>
          </div>
          {privacyNotice?.text ? (
            <details className="bc-surface-inset px-3 py-2">
              <summary className="min-h-6 cursor-pointer text-muted-foreground">{copy.readNotice}</summary>
              <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {privacyNotice.text}
              </pre>
            </details>
          ) : null}
          <Link
            href="/dashboard/policies/retention"
            prefetch={false}
            className="inline-block font-medium underline underline-offset-4"
          >
            {copy.editNotice}
          </Link>
        </div>

        <div className="space-y-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="font-medium">{copy.retention}</dt>
            <dd>
              <Badge variant="outline">{retention?.isStandard ? copy.retentionStandard : copy.retentionEdited}</Badge>
            </dd>
          </div>
          <p>{retention ? copy.days(retention.days) : null}</p>
          <Link
            href="/dashboard/policies/retention"
            prefetch={false}
            className="inline-block font-medium underline underline-offset-4"
          >
            {copy.changeRetention}
          </Link>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="font-medium">{copy.form}</dt>
            <dd>
              <Badge variant="outline">{copy.fields(form?.fields.length ?? 0)}</Badge>
            </dd>
          </div>
          <p className="text-muted-foreground">{copy.asks}</p>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {form?.fields.map((field) => (
              <li key={field.code}>
                {field.label}
                {field.required ? <span className="text-muted-foreground"> ({copy.required})</span> : null}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">{copy.noHighRisk}</p>
          <Link
            href="/dashboard/policies/forms"
            prefetch={false}
            className="inline-block font-medium underline underline-offset-4"
          >
            {copy.editForm}
          </Link>
        </div>
      </dl>

      <div className="space-y-3">
        <p className="max-w-prose text-muted-foreground text-xs">{copy.responsibility}</p>
        <SaveError message={error} />
        {summary.accepted && summary.acceptedAt ? (
          <p className="font-medium" role="status">
            {copy.acceptedOn(formatDate(summary.acceptedAt))}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="min-h-11"
            variant={summary.accepted ? "outline" : "default"}
            onClick={accept}
            disabled={pending}
          >
            {pending ? copy.accepting : summary.accepted ? copy.acceptAgain : copy.accept}
          </Button>
          {summary.accepted ? <p className="text-muted-foreground text-xs">{copy.again}</p> : null}
        </div>
      </div>
    </div>
  );
}
