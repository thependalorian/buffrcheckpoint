"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { visitSurveyCopy } from "@/lib/copy/visit-survey";

interface RatingOption {
  code: string;
  label: string;
  score: number;
}

type SurveyState = "choosing" | "saving" | "thanks" | "expired" | "failed";

/**
 * Optional one-tap rating after sign-out. The token from the sign-out
 * response proves the visit; nothing about the visitor is sent.
 */
export function VisitSurvey({ token }: { token: string }) {
  const [options, setOptions] = useState<RatingOption[]>([]);
  const [state, setState] = useState<SurveyState>("choosing");

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBaseUrl()}/public/visit-survey/options`)
      .then((res) => (res.ok ? (res.json() as Promise<RatingOption[]>) : []))
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(ratingCode: string) {
    setState("saving");
    try {
      const res = await fetch(`${apiBaseUrl()}/public/visit-survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ratingCode }),
      });
      if (res.status === 401) setState("expired");
      else setState(res.ok ? "thanks" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (options.length === 0) return null;
  if (state === "thanks" || state === "expired" || state === "failed") {
    return (
      <p className="text-sm" style={{ color: "#705C67" }} role="status">
        {visitSurveyCopy[state]}
      </p>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <legend className="px-1 font-medium text-sm" style={{ color: "#3D1152" }}>
        {visitSurveyCopy.question}
      </legend>
      <p className="text-muted-foreground text-xs">{visitSurveyCopy.optional}</p>
      <div className="grid grid-cols-5 gap-2">
        {options.map((option) => (
          <Button
            key={option.code}
            type="button"
            variant="outline"
            disabled={state === "saving"}
            onClick={() => submit(option.code)}
            className="flex h-auto flex-col gap-1 px-1 py-2"
            aria-label={`${option.score} of 5, ${option.label}`}
          >
            <span className="font-semibold text-base tabular-nums">{option.score}</span>
            <span className="text-[10px] leading-tight">{option.label}</span>
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
