import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/auth/backend-proxy";

export async function GET(request: Request) {
  const step = new URL(request.url).searchParams.get("step");
  if (!step) {
    return NextResponse.json({ error: "step is required" }, { status: 400 });
  }
  return proxyToBackend(request, `/auth/onboarding/evidence?step=${encodeURIComponent(step)}`, { method: "GET" });
}
