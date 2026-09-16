import * as Sentry from "@sentry/nextjs";

import { scrubPiiFromSentryEvent } from "./src/lib/observability/scrub-pii";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    includeLocalVariables: true,
    enableLogs: true,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    beforeSend(event) {
      return scrubPiiFromSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event;
    },
  });
}
