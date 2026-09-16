import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/email-verification/resend"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
  });

  if (!backendResponse.ok) {
    return NextResponse.json({ error: "Could not resend confirmation email" }, { status: backendResponse.status });
  }

  return NextResponse.json({ ok: true });
}
