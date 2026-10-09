import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { backendUrl } from "@/lib/auth/backend-url";
import { REFRESH_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  encodeSessionGate,
  GATE_HEADER,
  parseSessionGate,
  REQUEST_ID_HEADER,
  type SessionGate,
} from "@/lib/auth/session-gate";
import { secondsUntilExpiry } from "@/lib/auth/token-expiry";

const PUBLIC_AUTH_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/check-email",
  "/auth/verify-email",
  "/auth/mfa/challenge",
];

// Routes the onboarding checklist's "Open configuration" CTAs need before
// go-live. Everything else under /dashboard stays blocked until onboarding
// is complete (visitors / analytics are post-go-live). Front Desk is open so
// the owner can see and check out the onboarding test visit (§11.9.15.6).
const ONBOARDING_CONFIG_PREFIXES = [
  "/dashboard/account",
  "/dashboard/front-desk",
  "/dashboard/organisation",
  "/dashboard/sites",
  "/dashboard/hosts",
  "/dashboard/users",
  "/dashboard/roles",
  "/dashboard/site-experience",
  "/dashboard/policies",
  "/dashboard/devices",
  "/dashboard/compliance",
  "/dashboard/emergency",
  "/dashboard/evidence",
  "/dashboard/billing",
  "/dashboard/kyb",
];

const WAITING_PATH = "/onboarding/waiting";

/** Allowed while waiting for active/trial subscription after (or before) go-live. */
const BILLING_GATE_ALLOW_PREFIXES = [
  "/dashboard/billing",
  "/dashboard/kyb",
  "/dashboard/account",
  "/dashboard/organisation",
];

async function resolveGate(token: string, requestId: string): Promise<SessionGate | null> {
  try {
    const response = await fetch(backendUrl("/auth/session-gate"), {
      headers: { Authorization: `Bearer ${token}`, [REQUEST_ID_HEADER]: requestId },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return parseSessionGate(await response.json());
  } catch {
    return null;
  }
}

function matchesPrefix(prefixes: string[], pathname: string): boolean {
  return prefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Link prefetches render nothing visible; the real navigation is gated. */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") === true ||
    request.headers.has("x-middleware-prefetch")
  );
}

function redirectTo(path: string, request: NextRequest) {
  return NextResponse.redirect(new URL(path, request.url));
}

/** Where a gated user must go instead of `pathname`, or null when the request may proceed. */
export function gateRedirect(gate: SessionGate, pathname: string): string | null {
  if (!gate.emailVerified) {
    return pathname.startsWith("/auth/check-email") || pathname.startsWith("/auth/verify-email")
      ? null
      : "/auth/check-email";
  }
  // MFA comes after onboarding: optional while the organisation is being set up, required once it is live. The API enforces the same
  // rule (MfaAfterGoLiveGuard), so this redirect is the friendly half, not the only one.
  if (gate.onboardingComplete && !gate.mfaEnabled) {
    return pathname.startsWith("/auth/mfa/setup") ? null : "/auth/mfa/setup";
  }
  const homeAfterLive = gate.operationalUseAllowed ? "/dashboard/overview" : "/dashboard/billing";
  if (pathname === "/") {
    return gate.onboardingComplete ? homeAfterLive : gate.nextPath;
  }
  if (!gate.onboardingComplete) {
    if (!gate.canManageOnboarding) {
      // Invited staff without onboarding authority wait; they keep access to their own account.
      const allowed = pathname === WAITING_PATH || pathname.startsWith("/dashboard/account");
      if (!allowed && (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))) {
        return WAITING_PATH;
      }
    } else if (pathname === WAITING_PATH) {
      return gate.nextPath;
    }
    if (pathname.startsWith("/dashboard") && !matchesPrefix(ONBOARDING_CONFIG_PREFIXES, pathname)) {
      return gate.nextPath;
    }
    return matchesPrefix(PUBLIC_AUTH_PREFIXES, pathname) ? gate.nextPath : null;
  }
  if (matchesPrefix(PUBLIC_AUTH_PREFIXES, pathname)) return homeAfterLive;
  if (
    !gate.operationalUseAllowed &&
    pathname.startsWith("/dashboard") &&
    !matchesPrefix(BILLING_GATE_ALLOW_PREFIXES, pathname)
  ) {
    return "/dashboard/billing";
  }
  return null;
}

/** Refresh when fewer than this many seconds remain, so a request never reaches the API with a token about to expire. */
const REFRESH_WITHIN_SECONDS = 60;

type Refreshed = { accessToken: string; refreshToken: string } | "failed" | null;

/**
 * Exchanges the refresh cookie for a new access token when the current one is missing, expired or about to expire (SE-2).
 * On success it rewrites the cookies on this request so pages and route handlers see the new token, and returns the pair so the
 * response can set them in the browser. On failure the session is treated as signed out.
 */
async function refreshIfNeeded(request: NextRequest): Promise<Refreshed> {
  const access = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refresh) return null;
  const remaining = access ? secondsUntilExpiry(access) : null;
  if (access && remaining !== null && remaining > REFRESH_WITHIN_SECONDS) return null;
  try {
    const response = await fetch(backendUrl("/auth/refresh"), {
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
    // The API is unreachable: keep the cookies and let the normal path decide, rather than signing the person out on a network blip.
    return null;
  }
}

function applyRefresh(response: NextResponse, refreshed: Refreshed): NextResponse {
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

export async function proxy(request: NextRequest) {
  const refreshed = await refreshIfNeeded(request);
  // API routes only need the refreshed cookies; the page gate below is for page navigations.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return applyRefresh(NextResponse.next({ request: { headers: request.headers } }), refreshed);
  }
  return applyRefresh(await route(request), refreshed);
}

async function route(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

  // Never trust a client-supplied gate; forward only what this proxy resolved.
  const forwarded = new Headers(request.headers);
  forwarded.delete(GATE_HEADER);
  const requestId = crypto.randomUUID();
  forwarded.set(REQUEST_ID_HEADER, requestId);

  // Legacy bookmark: /login -> /auth/login
  if (pathname === "/login") return redirectTo("/auth/login", request);

  const needsAuth =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth/mfa/setup");

  if (!sessionToken) {
    if (!needsAuth) return NextResponse.next({ request: { headers: forwarded } });
    const loginUrl = new URL("/auth/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPrefetch(request)) {
    return NextResponse.next({ request: { headers: forwarded } });
  }

  const gate = await resolveGate(sessionToken, requestId);
  if (!gate) {
    // Session cookie present but the gate failed: fail closed (do not skip MFA/onboarding).
    if (needsAuth || matchesPrefix(PUBLIC_AUTH_PREFIXES, pathname)) {
      const loginUrl = new URL("/auth/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("next", pathname.startsWith("/auth/") ? "/dashboard/overview" : pathname);
      }
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
    return NextResponse.next({ request: { headers: forwarded } });
  }

  const target = gateRedirect(gate, pathname);
  if (target && target !== pathname) return redirectTo(target, request);

  forwarded.set(GATE_HEADER, encodeSessionGate(gate));
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/auth/login",
    "/auth/register",
    "/auth/check-email",
    "/auth/verify-email",
    "/auth/mfa/:path*",
    "/api/:path*",
  ],
};
