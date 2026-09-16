import posthog from "posthog-js";

import { hasAcceptedAnalyticsConsent } from "@/lib/observability/analytics-consent";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!KEY || !hasAcceptedAnalyticsConsent()) return;
  posthog.capture(event, properties);
}

export const AnalyticsEvents = {
  consentAccepted: "analytics_consent_accepted",
  consentDeclined: "analytics_consent_declined",
  loginSucceeded: "ops_login_succeeded",
  loginFailed: "ops_login_failed",
  loginMfaRequired: "ops_login_mfa_required",
  mfaChallengeSucceeded: "ops_mfa_challenge_succeeded",
  mfaChallengeFailed: "ops_mfa_challenge_failed",
} as const;
