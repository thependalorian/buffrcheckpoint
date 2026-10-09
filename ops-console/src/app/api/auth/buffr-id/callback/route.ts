import { NextResponse } from "next/server";

import { buffrIdClient, decodeFlow, FLOW_COOKIE, sameState } from "@/lib/auth/buffr-id";
import { setSessionCookie } from "@/lib/auth/session";

const BACKEND_API_URL = (process.env.BACKEND_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

function fail(origin: string, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
  response.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/buffr-id" });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = buffrIdClient(url.origin);
  if (!client) return fail(url.origin, "buffr_id_unavailable");

  const raw = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${FLOW_COOKIE}=`))
    ?.slice(FLOW_COOKIE.length + 1);
  const flow = decodeFlow(raw);
  if (!flow || !sameState(url.searchParams.get("state"), flow.state)) return fail(url.origin, "buffr_id_state");
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) return fail(url.origin, "buffr_id_denied");

  const tokenResponse = await fetch(`${client.issuer}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${encodeURIComponent(client.clientId)}:${encodeURIComponent(client.clientSecret)}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: client.redirectUri,
      code_verifier: flow.verifier,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!tokenResponse?.ok) return fail(url.origin, "buffr_id_token");
  const idToken = ((await tokenResponse.json().catch(() => ({}))) as { id_token?: string }).id_token;
  if (!idToken) return fail(url.origin, "buffr_id_token");

  const exchange = await fetch(`${BACKEND_API_URL}/auth/buffr-id/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken, nonce: flow.nonce, surface: "ops" }),
    cache: "no-store",
  });
  if (!exchange.ok) return fail(url.origin, exchange.status === 403 ? "buffr_id_two_step" : "buffr_id_failed");
  const session = (await exchange.json()) as { accessToken: string; refreshToken?: string };
  await setSessionCookie(session.accessToken, session.refreshToken);
  const response = NextResponse.redirect(new URL("/", url.origin));
  response.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/buffr-id" });
  return response;
}
