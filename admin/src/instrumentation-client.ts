import * as Sentry from "@sentry/nextjs";

import { scrubPiiFromSentryEvent } from "./lib/observability/scrub-pii";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/api\.buffrcheckpoint\.com/,
      process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "",
    ].filter(Boolean),
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      return scrubPiiFromSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
