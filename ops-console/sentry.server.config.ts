import * as Sentry from "@sentry/nextjs";

import { scrubPiiFromSentryEvent } from "./src/lib/observability/scrub-pii";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Ops shows cross-organisation data, so this is stricter than admin: no local
// variables on stack frames (they can hold other organisations' records).
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
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
