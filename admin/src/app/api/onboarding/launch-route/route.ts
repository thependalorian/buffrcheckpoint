import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/auth/backend-proxy";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.route !== "string") {
    return NextResponse.json({ error: "route is required" }, { status: 400 });
  }
  return proxyToBackend(request, "/auth/onboarding/launch-route", {
    method: "POST",
    body: { route: body.route },
  });
}
