import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { setMfaChallengeCookie, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (!backendResponse.ok) {
    const errorBody = (await backendResponse.json().catch(() => ({}))) as {
      message?: string | string[];
      retryAfterSeconds?: number;
    };
    const message = Array.isArray(errorBody.message)
      ? errorBody.message[0]
      : errorBody.message;
    return NextResponse.json(
      {
        error:
          message ??
          (backendResponse.status === 429
            ? "Too many failed sign-in attempts. Wait a few minutes or reset your password."
            : "Invalid email or password"),
        retryAfterSeconds: errorBody.retryAfterSeconds,
      },
      {
        status: backendResponse.status,
        headers:
          backendResponse.status === 429 && errorBody.retryAfterSeconds
            ? { "Retry-After": String(errorBody.retryAfterSeconds) }
            : undefined,
      },
    );
  }

  const payload = (await backendResponse.json()) as {
    accessToken?: string;
    emailVerified?: boolean;
    mfaEnabled?: boolean;
    onboardingComplete?: boolean;
    nextPath?: string;
    mfaRequired?: boolean;
    mfaChallengeToken?: string;
    emailVerificationRequired?: boolean;
  };

  if (payload.emailVerificationRequired) {
    return NextResponse.json({
      ok: false,
      emailVerificationRequired: true,
      email: body.email,
    });
  }

  if (payload.mfaRequired && payload.mfaChallengeToken) {
    // httpOnly cookie survives refresh / Strict Mode remounts; sessionStorage alone was
    // dropping or retaining stale tokens and surfacing "Invalid or expired MFA challenge".
    await setMfaChallengeCookie(payload.mfaChallengeToken);
    return NextResponse.json({
      ok: false,
      mfaRequired: true,
      mfaChallengeToken: payload.mfaChallengeToken,
    });
  }

  if (!payload.accessToken) {
    return NextResponse.json({ error: "Could not sign in" }, { status: 500 });
  }

  await setSessionCookie(payload.accessToken);

  return NextResponse.json({
    ok: true,
    emailVerified: payload.emailVerified ?? true,
    mfaEnabled: payload.mfaEnabled ?? false,
    onboardingComplete: payload.onboardingComplete ?? false,
    nextPath: payload.nextPath ?? "/dashboard/default",
  });
}
