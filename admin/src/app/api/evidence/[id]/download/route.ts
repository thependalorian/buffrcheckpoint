import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Streams a generated evidence pack to the browser. Same server-side
 * Bearer-token relay pattern as the other file-download proxies in this
 * app (the session lives in an httpOnly cookie the browser can't attach
 * to a direct backend request).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const upstream = await fetch(backendUrl(`/evidence/${id}/download`), {
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
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
