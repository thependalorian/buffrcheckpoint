import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { clearMfaChallengeCookie, getMfaChallengeToken, setSessionCookie } from "@/lib/auth/session";

function nestErrorMessage(errorBody: { message?: unknown }): string {
  const message = errorBody.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.map(String).join(" ");
  }
  return "Invalid authenticator code";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const challengeToken =
    (typeof body?.challengeToken === "string" && body.challengeToken.trim()) || (await getMfaChallengeToken());

  if (!challengeToken) {
    return NextResponse.json(
      { error: "MFA challenge expired. Sign in again to get a new code prompt." },
      { status: 401 },
    );
  }

  const backendResponse = await fetch(backendUrl("/auth/mfa/challenge/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeToken,
      code: body?.code,
      recoveryCode: body?.recoveryCode,
    }),
  });

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.json().catch(() => ({}));
    return NextResponse.json({ error: nestErrorMessage(errorBody) }, { status: backendResponse.status });
  }

  const payload = (await backendResponse.json()) as {
    accessToken: string;
    nextPath: string;
  };

  await clearMfaChallengeCookie();
  await setSessionCookie(payload.accessToken);

  return NextResponse.json({ ok: true, nextPath: payload.nextPath });
}
