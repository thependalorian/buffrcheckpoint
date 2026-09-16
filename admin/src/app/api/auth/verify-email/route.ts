import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.token || typeof body.token !== "string") {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/email-verification/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: body.token }),
  });

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorBody.message ?? "Invalid or expired verification link" },
      { status: backendResponse.status },
    );
  }

  const payload = (await backendResponse.json()) as {
    accessToken: string;
    nextPath: string;
    mfaEnabled: boolean;
  };

  await setSessionCookie(payload.accessToken);

  return NextResponse.json({
    ok: true,
    nextPath: payload.nextPath,
    mfaEnabled: payload.mfaEnabled,
  });
}
