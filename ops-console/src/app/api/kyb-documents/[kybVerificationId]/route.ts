import { NextResponse } from "next/server";

import { getSessionToken } from "@/lib/auth/session";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

/**
 * Streams a KYB registration document to the browser. The backend blob is
 * private and gated by a staff Bearer JWT the browser never holds directly
 * (the session lives in an httpOnly cookie) — this route runs server-side,
 * attaches that token, and relays the response so a plain <a href> in the
 * ops-console UI can trigger a download.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ kybVerificationId: string }> }) {
  const { kybVerificationId } = await params;
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND_API_URL}/platform/kyb/documents/${kybVerificationId}/file`, {
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
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
