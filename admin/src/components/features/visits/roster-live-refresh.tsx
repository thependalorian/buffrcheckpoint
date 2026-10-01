"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { rosterLiveCopy } from "@/lib/copy/visits";

const REFRESH_DEBOUNCE_MS = 1000;
const FALLBACK_REFRESH_MS = 30_000;

/**
 * Keeps a server-rendered roster page current. Subscribes to the roster-change
 * stream (app/api/visits/stream) and re-renders the page via router.refresh()
 * when a check-in, check-out, approval or emergency event lands — debounced so
 * a burst of arrivals causes one re-fetch. If the stream drops, EventSource
 * reconnects on its own; until it does, the page falls back to a 30-second
 * refresh and says so, rather than silently showing stale data.
 */
export function RosterLiveRefresh({ siteId }: { siteId?: string }) {
  const router = useRouter();
  const [connected, setConnected] = React.useState(true);

  React.useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;

    const refreshSoon = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };
    const stopFallback = () => {
      if (fallback) clearInterval(fallback);
      fallback = null;
    };

    const query = siteId ? `?${new URLSearchParams({ siteId })}` : "";
    const source = new EventSource(`/api/visits/stream${query}`);
    source.addEventListener("roster_changed", refreshSoon);
    source.onopen = () => {
      setConnected(true);
      if (fallback) {
        stopFallback();
        refreshSoon(); // catch up on anything missed while disconnected
      }
    };
    source.onerror = () => {
      setConnected(false);
      fallback ??= setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);
    };

    return () => {
      source.close();
      if (debounce) clearTimeout(debounce);
      stopFallback();
    };
  }, [router, siteId]);

  return connected ? (
    <Badge variant="outline" title={rosterLiveCopy.liveHint}>
      <span aria-hidden className="size-2 rounded-full bg-status-live" />
      {rosterLiveCopy.live}
    </Badge>
  ) : (
    <Badge variant="secondary" title={rosterLiveCopy.pausedHint}>
      {rosterLiveCopy.paused}
    </Badge>
  );
}
