import { NextResponse } from "next/server";

import { authorizeUrl, buffrIdClient, encodeFlow, FLOW_COOKIE, FLOW_MAX_AGE_SECONDS, type FlowIntent, pkcePair, randomToken } from "@/lib/auth/buffr-id";
import { safeNextPath } from "@/lib/auth/safe-next-path";

// Starts a Buffr ID sign-in or sign-up. A GET: it only redirects, and the callback checks the state this sets.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = buffrIdClient(url.origin);
  if (!client) return NextResponse.redirect(new URL("/auth/login?error=buffr_id_unavailable", url.origin));

  const intent: FlowIntent = url.searchParams.get("intent") === "register" ? "register" : "signin";
  const organisationName = url.searchParams.get("org")?.trim().slice(0, 200) || null;
  const sectorCode = url.searchParams.get("sector")?.trim().slice(0, 80) || null;
  if (intent === "register" && (!organisationName || !sectorCode)) {
    return NextResponse.redirect(new URL("/auth/register?error=details_required", url.origin));
  }

  const { verifier, challenge } = pkcePair();
  const state = randomToken(24);
  const nonce = randomToken(24);
  const response = NextResponse.redirect(authorizeUrl(client, { state, nonce, challenge }));
  response.cookies.set(
    FLOW_COOKIE,
    encodeFlow({
      state,
      nonce,
      verifier,
      intent,
      next: url.searchParams.get("next") ? safeNextPath(url.searchParams.get("next")) : null,
      organisationName,
      sectorCode,
    }),
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/buffr-id", maxAge: FLOW_MAX_AGE_SECONDS },
  );
  return response;
}
