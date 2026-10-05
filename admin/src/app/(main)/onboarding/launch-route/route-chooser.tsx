"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { AnalyticsEvents, track } from "@/lib/observability/track";
import { elapsedSeconds, type LaunchRoute } from "@/lib/onboarding/readiness";
import { cn } from "@/lib/utils";

import { rememberConflict } from "../_components/conflict-notice";

const ROUTES: readonly LaunchRoute[] = ["qr_first", "kiosk"];

function buttonLabel(route: LaunchRoute, saving: boolean, selected: boolean): string {
  const copy = onboardingCopy.launchRoute;
  if (saving) return copy.saving;
  return selected ? copy.current : copy.options[route].choose;
}

export function RouteChooser({
  current,
  locked,
  startedAt,
}: {
  current: LaunchRoute | null;
  locked: boolean;
  startedAt: string;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState<LaunchRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = onboardingCopy.launchRoute;

  async function choose(route: LaunchRoute) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(route);
    setError(null);
    try {
      const response = await fetch("/api/onboarding/launch-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
        if (response.status === 409) {
          // The only 409 that keeps the user here is "setup closed"; its message is customer copy.
          const conflict = result as { error?: string; code?: string; changedBy?: string | null };
          if (conflict.code !== "ONBOARDING_SETUP_CLOSED") {
            rememberConflict(conflict.changedBy ?? null);
            router.push("/onboarding");
            router.refresh();
            return;
          }
        }
        setError(result.error ?? onboardingCopy.genericError);
        router.refresh();
        return;
      }
      track(AnalyticsEvents.onboardingLaunchRouteChosen, {
        route,
        launch_route: route,
        elapsed_seconds: elapsedSeconds(startedAt),
      });
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError(onboardingCopy.genericError);
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      {locked ? <p className="text-muted-foreground text-sm">{copy.lockedAfterSetup}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {ROUTES.map((route) => {
          const option = copy.options[route];
          const selected = current === route;
          return (
            <section
              key={route}
              className={cn("bc-panel flex flex-col gap-3", selected && "border-primary bg-primary/5")}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-lg">{option.title}</h3>
                {route === "qr_first" ? <Badge>{copy.recommended}</Badge> : null}
              </div>
              <p className="text-muted-foreground text-sm">{option.description}</p>
              <ul className="flex-1 list-disc space-y-1 pl-5 text-sm">
                {option.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Button
                className="min-h-11"
                variant={selected ? "secondary" : "default"}
                disabled={pending !== null || selected || locked}
                onClick={() => choose(route)}
              >
                {buttonLabel(route, pending === route, selected)}
              </Button>
            </section>
          );
        })}
      </div>
      <p className="text-muted-foreground text-sm">{copy.changeLater}</p>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
