import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Streams the visitor-roster CSV export to the browser. The backend route
 * requires the session JWT as a Bearer token, which the browser never holds
 * directly (it lives in an httpOnly cookie) — this route runs server-side,
 * attaches that token, and relays the response so the "Download CSV" button
 * in VisitRosterTable can trigger a download via a plain link.
 */
export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { search } = new URL(request.url);
  const upstream = await fetch(backendUrl(`/visits/roster/export${search}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json({ message: body || upstream.statusText }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/csv",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
