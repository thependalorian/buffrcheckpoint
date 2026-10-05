import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/auth/backend-proxy";

export async function GET(request: Request) {
  return proxyToBackend(request, "/onboarding/test-visit", { method: "GET" });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  return proxyToBackend(request, "/onboarding/test-visit", { method: "POST", body: { id: body.id } });
}
