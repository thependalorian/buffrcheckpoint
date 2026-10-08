"use client";

import { useSearchParams } from "next/navigation";

import { CheckInShell } from "@/app/check-in/check-in-shell";
import { VisitSurvey } from "@/app/check-out/visit-survey";
import { visitSurveyCopy } from "@/lib/copy/visit-survey";

/** The emailed link carries the signed token as ?t=. Without one there is nothing to rate. */
export default function RateClient() {
  const token = useSearchParams().get("t")?.trim() ?? "";
  return (
    <CheckInShell label={visitSurveyCopy.rate.title}>
      <div className="flex flex-col gap-4">
        <h1 className="text-foreground tracking-tight">{visitSurveyCopy.rate.title}</h1>
        {token ? (
          <>
            <p className="text-muted-foreground text-sm">{visitSurveyCopy.rate.intro}</p>
            <VisitSurvey token={token} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm" role="alert">
            {visitSurveyCopy.rate.missingLink}
          </p>
        )}
      </div>
    </CheckInShell>
  );
}
