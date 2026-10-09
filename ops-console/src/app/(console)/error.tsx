"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { DashboardErrorState } from "@/components/dashboard-state";
import { Button } from "@/components/ui/button";

export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <DashboardErrorState message={error.message || "API error 500"} />
      <Button type="button" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
