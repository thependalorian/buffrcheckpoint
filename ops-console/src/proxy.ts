import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { REFRESH_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { secondsUntilExpiry } from "@/lib/auth/token-expiry";

const BACKEND_API_URL = (process.env.BACKEND_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

/** Refresh when fewer than this many seconds remain, so a request never reaches the API with a token about to expire. */
const REFRESH_WITHIN_SECONDS = 60;

type Refreshed = { accessToken: string; refreshToken: string } | "failed" | null;

/**
 * Exchanges the refresh cookie for a new access token when the current one is missing, expired or about to expire (SE-2).
 * On success it rewrites the cookies on this request so pages and actions see the new token, and returns the pair so the response can
 * set them in the browser. On failure the session is dropped and the console sends the person to sign in again.
 */
async function refreshIfNeeded(request: NextRequest): Promise<Refreshed> {
  const access = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refresh) return null;
  const remaining = access ? secondsUntilExpiry(access) : null;
  if (access && remaining !== null && remaining > REFRESH_WITHIN_SECONDS) return null;
  try {
    const response = await fetch(`${BACKEND_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
    });
    if (!response.ok) {
      request.cookies.delete(SESSION_COOKIE_NAME);
      request.cookies.delete(REFRESH_COOKIE_NAME);
      return "failed";
    }
    const body = (await response.json()) as { accessToken?: string; refreshToken?: string };
    if (!body.accessToken || !body.refreshToken) return "failed";
    request.cookies.set(SESSION_COOKIE_NAME, body.accessToken);
    request.cookies.set(REFRESH_COOKIE_NAME, body.refreshToken);
    return { accessToken: body.accessToken, refreshToken: body.refreshToken };
  } catch {
    // The API is unreachable: keep the cookies rather than signing staff out on a network blip.
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const refreshed = await refreshIfNeeded(request);
  const response = NextResponse.next({ request: { headers: request.headers } });
  if (refreshed === "failed") {
    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(REFRESH_COOKIE_NAME);
  } else if (refreshed) {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    };
    response.cookies.set(SESSION_COOKIE_NAME, refreshed.accessToken, options);
    response.cookies.set(REFRESH_COOKIE_NAME, refreshed.refreshToken, options);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|monitoring).*)"],
};
