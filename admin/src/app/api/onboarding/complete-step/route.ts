import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getSessionToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.stepCode) {
    return NextResponse.json({ error: "stepCode is required" }, { status: 400 });
  }

  const backendResponse = await fetch(backendUrl("/auth/onboarding/complete-step"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stepCode: body.stepCode }),
  });

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(
      {
        error: errorBody.message ?? "Could not complete onboarding step",
        missingEvidence: errorBody.missingEvidence ?? errorBody.message?.missingEvidence,
      },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(await backendResponse.json());
}
