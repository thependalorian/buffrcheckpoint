import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { isSameOriginRequest } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.organisationName || !body?.sectorCode || !body?.email || !body?.password) {
    return NextResponse.json({ error: "Organisation name, sector, email, and password are required" }, { status: 400 });
  }

  const response = await fetch(backendUrl("/onboarding/organisation-admin"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organisationName: body.organisationName,
      sectorCode: body.sectorCode,
      email: body.email,
      password: body.password,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return NextResponse.json({ error: errorBody.message ?? "Could not create account" }, { status: response.status });
  }

  const payload = (await response.json()) as {
    ok: true;
    email: string;
    organisationId: string;
    emailVerificationRequired: true;
  };

  // No session cookie until email verification succeeds.
  return NextResponse.json({
    ok: true,
    email: payload.email,
    emailVerificationRequired: true,
  });
}
