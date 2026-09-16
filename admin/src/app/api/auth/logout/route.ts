import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/csrf";
import { clearMfaChallengeCookie, clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  await clearSessionCookie();
  await clearMfaChallengeCookie();
  return NextResponse.json({ ok: true });
}
