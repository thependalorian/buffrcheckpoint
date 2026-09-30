import posthog from "posthog-js";

import { hasAcceptedAnalyticsConsent } from "@/lib/observability/analytics-consent";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** Consent-gated capture. Never send visitor names, phones, emails, or free text. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!KEY || !hasAcceptedAnalyticsConsent()) return;
  posthog.capture(event, properties);
}

/**
 * Decision-oriented taxonomy (Provost & Fawcett): events are features for
 * repeated decisions — completion, drop-off, channel mix — not vanity counts.
 * Properties are codes/counts only (no PII).
 */
export const AnalyticsEvents = {
  consentAccepted: "analytics_consent_accepted",
  consentDeclined: "analytics_consent_declined",
  // Visitor web journey — target: check-in completed (and later signed out)
  checkInStarted: "web_check_in_started",
  checkInContextFailed: "web_check_in_context_failed",
  checkInFormLoaded: "web_check_in_form_loaded",
  checkInFailed: "web_check_in_failed",
  checkInCompleted: "web_check_in_completed",
  checkInPassPrinted: "web_check_in_pass_printed",
  checkOutStarted: "web_check_out_started",
  checkOutFailed: "web_check_out_failed",
  checkOutCompleted: "web_check_out_completed",
} as const;
