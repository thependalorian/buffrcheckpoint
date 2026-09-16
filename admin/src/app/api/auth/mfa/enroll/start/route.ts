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

  const backendResponse = await fetch(backendUrl("/auth/mfa/enroll/start"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorBody.message ?? "Could not start MFA enrollment" },
      { status: backendResponse.status },
    );
  }

  return NextResponse.json(await backendResponse.json());
}
