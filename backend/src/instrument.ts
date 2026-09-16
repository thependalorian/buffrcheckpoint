import * as Sentry from "@sentry/nestjs";

import { scrubPiiFromSentryEvent } from "./common/observability/scrub-pii";

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubPiiFromSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event;
    },
  });
}
