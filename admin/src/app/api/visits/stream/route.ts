import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { getSessionToken } from "@/lib/auth/session";

// A held-open stream: never cache, never pre-render.
export const dynamic = "force-dynamic";

/**
 * Relays the backend's roster-change event stream (Server-Sent Events) to the
 * browser with the session token attached server-side — same pattern as
 * app/api/visits/roster/export/route.ts. Events carry ids only; the page
 * re-fetches the roster through its normal server render on each one.
 */
export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { search } = new URL(request.url);
  const upstream = await fetch(backendUrl(`/visits/roster/stream${search}`), {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    cache: "no-store",
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json({ message: body || upstream.statusText }, { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
