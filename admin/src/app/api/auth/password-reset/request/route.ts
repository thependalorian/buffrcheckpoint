import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/password-reset/request"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
  });

  // Anti-enumeration: always return success-shaped response to the client when backend is reachable.
  if (!backendResponse.ok && backendResponse.status >= 500) {
    return NextResponse.json({ error: "Could not start password reset" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
