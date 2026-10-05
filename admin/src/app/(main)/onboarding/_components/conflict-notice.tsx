"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";

const CONFLICT_KEY = "bc_onboarding_conflict";

interface StoredConflict {
  changedBy: string | null;
}

/** Called by a step write that hit a 409, before it sends the user back to the refreshed readiness home. */
export function rememberConflict(changedBy: string | null): void {
  try {
    window.sessionStorage.setItem(CONFLICT_KEY, JSON.stringify({ changedBy } satisfies StoredConflict));
  } catch {
    // Storage disabled: the refreshed page still shows the latest state.
  }
}

function takeConflict(): StoredConflict | null {
  try {
    const raw = window.sessionStorage.getItem(CONFLICT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(CONFLICT_KEY);
    return JSON.parse(raw) as StoredConflict;
  } catch {
    return null;
  }
}

/** Human explanation of a multi-admin collision (§11.9.15.9); never a raw 409. */
export function ConflictNotice() {
  const [conflict, setConflict] = useState<StoredConflict | null>(null);
  useEffect(() => setConflict(takeConflict()), []);
  if (!conflict) return null;

  const copy = onboardingCopy.conflict;
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1">
        <p className="font-medium">{conflict.changedBy ? copy.withActor(conflict.changedBy) : copy.withoutActor}</p>
        <p className="text-muted-foreground">{copy.refreshed}</p>
      </div>
      <Button variant="outline" className="min-h-11 shrink-0" onClick={() => setConflict(null)}>
        {copy.review}
      </Button>
    </div>
  );
}
