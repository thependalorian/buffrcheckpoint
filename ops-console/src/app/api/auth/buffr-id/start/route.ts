import { NextResponse } from "next/server";

import { authorizeUrl, buffrIdClient, encodeFlow, FLOW_COOKIE, FLOW_MAX_AGE_SECONDS, pkcePair, randomToken } from "@/lib/auth/buffr-id";

// Starts a platform-staff sign-in with Buffr ID. Staff accounts must have two-step sign-in on in Buffr ID; the API refuses otherwise.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = buffrIdClient(url.origin);
  if (!client) return NextResponse.redirect(new URL("/login?error=buffr_id_unavailable", url.origin));
  const { verifier, challenge } = pkcePair();
  const state = randomToken(24);
  const nonce = randomToken(24);
  const response = NextResponse.redirect(authorizeUrl(client, { state, nonce, challenge }));
  response.cookies.set(FLOW_COOKIE, encodeFlow({ state, nonce, verifier, intent: "signin", next: null, organisationName: null, sectorCode: null }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/buffr-id", maxAge: FLOW_MAX_AGE_SECONDS,
  });
  return response;
}
