"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiBaseUrl } from "@/lib/api";
import { visitSurveyCopy } from "@/lib/copy/visit-survey";

interface RatingOption {
  code: string;
  label: string;
  score: number;
}

type SurveyState = "choosing" | "saving" | "thanks" | "expired" | "failed";

// Mustard fill with a charcoal outline: the outline carries the contrast on any background, the fill carries the brand.
function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-9" aria-hidden="true" focusable="false">
      <path
        d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z"
        strokeWidth="1.75"
        strokeLinejoin="round"
        className={cn("stroke-foreground", filled ? "fill-[var(--color-sodium-yellow)]" : "fill-transparent")}
      />
    </svg>
  );
}

/**
 * Optional 1 to 5 star rating with an optional comment, after sign-out or from the emailed link. The token proves the visit;
 * nothing about the visitor is sent. Native radio inputs give the keyboard behaviour (arrow keys move between stars).
 */
export function VisitSurvey({ token }: { token: string }) {
  const groupName = useId();
  const commentId = useId();
  const [options, setOptions] = useState<RatingOption[]>([]);
  const [state, setState] = useState<SurveyState>("choosing");
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

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

  async function submit() {
    if (score < 1) return;
    setState("saving");
    try {
      const res = await fetch(`${apiBaseUrl()}/public/visit-survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating: score, comment: comment.trim() || undefined }),
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
      <p className="text-sm text-muted-foreground" role="status">
        {visitSurveyCopy[state]}
      </p>
    );
  }

  const shown = hover || score;
  const chosen = options.find((option) => option.score === score);
  const busy = state === "saving";

  return (
    <form
      className="space-y-4 rounded-lg border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <fieldset className="space-y-2" disabled={busy}>
        <legend className="font-medium text-foreground text-sm">{visitSurveyCopy.question}</legend>
        <p className="text-muted-foreground text-xs">{visitSurveyCopy.optional}</p>
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-label={visitSurveyCopy.starsLegend}
          onMouseLeave={() => setHover(0)}
        >
          {options.map((option) => (
            <label
              key={option.code}
              className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60"
              onMouseEnter={() => setHover(option.score)}
            >
              <input
                type="radio"
                name={groupName}
                value={option.score}
                checked={score === option.score}
                onChange={() => setScore(option.score)}
                className="sr-only"
                aria-label={visitSurveyCopy.starLabel(option.score, option.label)}
              />
              <Star filled={option.score <= shown} />
            </label>
          ))}
        </div>
        <p className="min-h-5 text-foreground text-sm" aria-live="polite">
          {chosen ? visitSurveyCopy.chosen(chosen.score, chosen.label) : ""}
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor={commentId}>{visitSurveyCopy.commentLabel}</Label>
        <Textarea
          id={commentId}
          value={comment}
          maxLength={visitSurveyCopy.maxCommentLength}
          placeholder={visitSurveyCopy.commentPlaceholder}
          disabled={busy}
          onChange={(event) => setComment(event.target.value)}
          aria-describedby={`${commentId}-help`}
          rows={3}
        />
        <p id={`${commentId}-help`} className="flex justify-between gap-3 text-muted-foreground text-xs">
          <span>{visitSurveyCopy.commentHelp}</span>
          <span className="shrink-0 tabular-nums">
            {visitSurveyCopy.charactersLeft(visitSurveyCopy.maxCommentLength - comment.length)}
          </span>
        </p>
      </div>

      <Button type="submit" disabled={score < 1 || busy}>
        {busy ? visitSurveyCopy.saving : visitSurveyCopy.submit}
      </Button>
    </form>
  );
}
