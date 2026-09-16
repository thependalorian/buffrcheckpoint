import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.token || !body?.newPassword) {
    return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/password-reset/confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: body.token, newPassword: body.newPassword }),
  });

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorBody.message ?? "Could not reset password" },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json({ ok: true });
}
