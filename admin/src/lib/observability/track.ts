import posthog from "posthog-js";

import { hasAcceptedAnalyticsConsent } from "@/lib/observability/analytics-consent";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** Consent-gated capture. Never send emails, passwords, or visitor PII. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!KEY || !hasAcceptedAnalyticsConsent()) return;
  posthog.capture(event, properties);
}

export function identifyStaff(distinctId: string, properties?: Record<string, string | number | boolean | null>) {
  if (!KEY || !hasAcceptedAnalyticsConsent() || !distinctId) return;
  posthog.identify(distinctId, properties);
}

/**
 * Decision-oriented taxonomy (Provost & Fawcett): instrument for activation,
 * auth friction, and onboarding completion — not for browsing vanity.
 */
export const AnalyticsEvents = {
  consentAccepted: "analytics_consent_accepted",
  consentDeclined: "analytics_consent_declined",
  loginSucceeded: "admin_login_succeeded",
  loginFailed: "admin_login_failed",
  loginLockedOut: "admin_login_locked_out",
  loginMfaRequired: "admin_login_mfa_required",
  mfaChallengeSucceeded: "admin_mfa_challenge_succeeded",
  mfaChallengeFailed: "admin_mfa_challenge_failed",
  registerSucceeded: "admin_register_succeeded",
  registerFailed: "admin_register_failed",
  passwordResetRequested: "admin_password_reset_requested",
  passwordResetConfirmed: "admin_password_reset_confirmed",
  passwordResetFailed: "admin_password_reset_failed",
  onboardingStarted: "admin_onboarding_started",
  onboardingStepViewed: "admin_onboarding_step_viewed",
  onboardingStepCompleted: "admin_onboarding_step_completed",
  onboardingStepBlocked: "admin_onboarding_step_blocked",
  onboardingStepSkipped: "admin_onboarding_step_skipped",
  onboardingLaunchRouteChosen: "admin_onboarding_launch_route_chosen",
  onboardingTestVisitCreated: "admin_onboarding_test_visit_created",
  onboardingLive: "admin_onboarding_live",
  // North-star milestones (buffrcheckpoint.md §7.11): one per organisation, codes and timings only.
  onboardingFirstSite: "admin_onboarding_first_site",
  onboardingFirstQr: "admin_onboarding_first_qr",
  onboardingFirstTestVisit: "admin_onboarding_first_test_visit",
  onboardingTestVisitCheckedOut: "admin_onboarding_test_visit_checked_out",
  /** Click on an onboarding link to the next page rendering, for the p95 feedback measure. */
  onboardingNavigationMs: "admin_onboarding_navigation_ms",
  frontDeskCheckout: "admin_front_desk_checkout",
} as const;
