"use client";

import { Suspense, useEffect, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

import { Button } from "@/components/ui/button";
import {
  hasAcceptedAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
  readAnalyticsConsent,
} from "@/lib/observability/analytics-consent";
import { AnalyticsEvents } from "@/lib/observability/track";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY || !hasAcceptedAnalyticsConsent()) return;
    const qs = searchParams?.toString();
    posthog.capture("$pageview", {
      $current_url: window.location.origin + pathname + (qs ? `?${qs}` : ""),
    });
  }, [pathname, searchParams]);

  return null;
}

function CookieConsentBanner({ onChoice }: { onChoice: (value: AnalyticsConsent) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--color-frost)] bg-background/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Optional product analytics for the admin app load only after you accept. Session auth cookies are essential
          and do not require consent. No visitor PII is sent to analytics.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChoice("declined")}>
            Decline
          </Button>
          <Button type="button" size="sm" onClick={() => onChoice("accepted")}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsProviders({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    setConsent(readAnalyticsConsent());
  }, []);

  useEffect(() => {
    if (!KEY || consent !== "accepted" || initialized) return;
    posthog.init(KEY, {
      api_host: HOST,
      defaults: "2026-05-30",
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only",
      disable_session_recording: true,
    });
    initialized = true;
    posthog.capture(AnalyticsEvents.consentAccepted, { surface: "admin" });
  }, [consent]);

  const onChoice = (value: AnalyticsConsent) => {
    writeAnalyticsConsent(value);
    setConsent(value);
  };

  if (!KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
      {consent === null ? <CookieConsentBanner onChoice={onChoice} /> : null}
    </PHProvider>
  );
}
