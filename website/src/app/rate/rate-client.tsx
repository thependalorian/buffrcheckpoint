"use client";

import { useSearchParams } from "next/navigation";

import { VisitSurvey } from "@/app/check-out/visit-survey";
import { visitSurveyCopy } from "@/lib/copy/visit-survey";

/** The emailed link carries the signed token as ?t=. Without one there is nothing to rate. */
export default function RateClient() {
  const token = useSearchParams().get("t")?.trim() ?? "";
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="font-semibold text-2xl text-foreground tracking-tight">{visitSurveyCopy.rate.title}</h1>
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
    </main>
  );
}
