import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/auth/backend-proxy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks out the onboarding test visitor through the normal visit check-out path. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.visitId !== "string" || !UUID.test(body.visitId)) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }
  return proxyToBackend(request, `/visits/${body.visitId}/check-out`, { method: "POST" });
}
