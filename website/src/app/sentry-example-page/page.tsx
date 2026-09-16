"use client";

import { useState } from "react";

import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

/**
 * Temporary verification page from skills.sentry.dev Next.js setup.
 * Delete after a real error is confirmed in the Sentry Issues dashboard.
 */
export default function SentryExamplePage() {
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sentry example</h1>
      <p className="text-sm text-muted-foreground">
        Triggers a client-side exception through the live `@sentry/nextjs` init. Requires{" "}
        <code>NEXT_PUBLIC_SENTRY_DSN</code>. Remove this route after verification.
      </p>
      <Button
        type="button"
        onClick={() => {
          const eventId = Sentry.captureException(new Error("Sentry test error — delete me"));
          setLastEventId(eventId);
          throw new Error("Sentry test error — delete me");
        }}
      >
        Throw test error
      </Button>
      {lastEventId ? <p className="text-xs text-muted-foreground">Event id: {lastEventId}</p> : null}
    </main>
  );
}
