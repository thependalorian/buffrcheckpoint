import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.code) {
    return NextResponse.json({ error: "Authenticator code is required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/mfa/enroll/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code: body.code }),
  });

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorBody.message ?? "Could not confirm MFA" },
      { status: backendResponse.status },
    );
  }

  const payload = (await backendResponse.json()) as {
    recoveryCodes: string[];
    nextPath: string;
    accessToken: string;
    refreshToken?: string;
  };

  await setSessionCookie(payload.accessToken, payload.refreshToken);

  return NextResponse.json({
    recoveryCodes: payload.recoveryCodes,
    nextPath: payload.nextPath,
  });
}
