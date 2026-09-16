import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { getSessionToken } from "@/lib/auth/session";

export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const step = new URL(request.url).searchParams.get("step");
  if (!step) {
    return NextResponse.json({ error: "step is required" }, { status: 400 });
  }
  const backendResponse = await fetch(backendUrl(`/auth/onboarding/evidence?step=${encodeURIComponent(step)}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await backendResponse.json().catch(() => ({}));
  return NextResponse.json(body, { status: backendResponse.status });
}
