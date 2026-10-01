import * as Sentry from "@sentry/nextjs";

import { scrubPiiFromSentryEvent } from "./lib/observability/scrub-pii";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Ops shows cross-organisation data, so Session Replay is off here (admin
// keeps it, fully masked). Errors and traces only.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    enableLogs: true,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    tracePropagationTargets: ["localhost", /^https:\/\/api\.buffrcheckpoint\.com/],
    beforeSend(event) {
      return scrubPiiFromSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
