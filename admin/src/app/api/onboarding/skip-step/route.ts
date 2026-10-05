import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/auth/backend-proxy";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.stepCode !== "string") {
    return NextResponse.json({ error: "stepCode is required" }, { status: 400 });
  }
  return proxyToBackend(request, "/auth/onboarding/skip-step", {
    method: "POST",
    body: { stepCode: body.stepCode },
  });
}
