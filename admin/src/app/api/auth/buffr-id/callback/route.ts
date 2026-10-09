import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { buffrIdClient, decodeFlow, FLOW_COOKIE, sameState } from "@/lib/auth/buffr-id";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { setSessionCookie } from "@/lib/auth/session";

function fail(origin: string, code: string) {
  const response = NextResponse.redirect(new URL(`/auth/login?error=${code}`, origin));
  response.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/buffr-id" });
  return response;
}

// Finishes a Buffr ID sign-in: checks the state, trades the code for an ID token (PKCE, client secret), then asks the backend to turn
// that token into a Checkpoint session. The browser never sees the ID token.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const client = buffrIdClient(url.origin);
  if (!client) return fail(url.origin, "buffr_id_unavailable");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const raw = cookieHeader
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

  const post = (path: string, body: Record<string, unknown>) =>
    fetch(backendUrl(path), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

  if (flow.intent === "register") {
    const created = await post("/onboarding/organisation-buffr-id", {
      idToken,
      nonce: flow.nonce,
      organisationName: flow.organisationName,
      sectorCode: flow.sectorCode,
      acceptTerms: flow.acceptTerms,
    });
    if (!created.ok && created.status !== 409) {
      return NextResponse.redirect(
        new URL(`/auth/register?error=${created.status === 429 ? "busy" : "create_failed"}`, url.origin),
      );
    }
  }

  const exchange = await post("/auth/buffr-id/exchange", { idToken, nonce: flow.nonce, surface: "admin" });
  if (exchange.status === 404) return NextResponse.redirect(new URL("/auth/register?error=no_account", url.origin));
  if (!exchange.ok) return fail(url.origin, exchange.status === 403 ? "buffr_id_forbidden" : "buffr_id_failed");
  const session = (await exchange.json()) as { accessToken: string; refreshToken?: string; nextPath?: string };

  await setSessionCookie(session.accessToken, session.refreshToken);
  const response = NextResponse.redirect(new URL(safeNextPath(session.nextPath, "/dashboard/overview"), url.origin));
  response.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/buffr-id" });
  return response;
}
