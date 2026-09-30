import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const PUBLIC_AUTH_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/check-email",
  "/auth/verify-email",
  "/auth/mfa/challenge",
];

// Routes the onboarding wizard's "Open configuration" CTAs need before
// go-live. Everything else under /dashboard stays blocked until onboarding
// is complete (front desk / visitors / analytics are post-go-live).
const ONBOARDING_CONFIG_PREFIXES = [
  "/dashboard/account",
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

/** Allowed while waiting for active/trial subscription after (or before) go-live. */
const BILLING_GATE_ALLOW_PREFIXES = [
  "/dashboard/billing",
  "/dashboard/kyb",
  "/dashboard/account",
  "/dashboard/organisation",
];

function backendBaseUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

async function resolveGate(token: string): Promise<{
  emailVerified: boolean;
  mfaEnabled: boolean;
  onboardingComplete: boolean;
  nextPath: string;
  operationalUseAllowed: boolean;
} | null> {
  try {
    const response = await fetch(`${backendBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const me = (await response.json()) as {
      user?: { emailVerified?: boolean; mfaEnabled?: boolean };
      onboarding?: { complete?: boolean; nextPath?: string };
      subscription?: { operationalUseAllowed?: boolean };
    };
    return {
      emailVerified: me.user?.emailVerified === true,
      mfaEnabled: me.user?.mfaEnabled === true,
      onboardingComplete: me.onboarding?.complete === true,
      nextPath: me.onboarding?.nextPath ?? "/onboarding",
      operationalUseAllowed: me.subscription?.operationalUseAllowed === true,
    };
  } catch {
    return null;
  }
}

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isOnboardingConfigPath(pathname: string): boolean {
  return ONBOARDING_CONFIG_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isBillingGateAllowPath(pathname: string): boolean {
  return BILLING_GATE_ALLOW_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  const hasSession = Boolean(sessionToken);

  const needsAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth/mfa/setup");

  if (!hasSession && needsAuth) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && sessionToken) {
    const gate = await resolveGate(sessionToken);
    if (!gate) {
      // Session cookie present but /auth/me failed — fail closed (do not skip MFA/onboarding).
      if (needsAuth || isPublicAuthPath(pathname)) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("next", pathname.startsWith("/auth/") ? "/dashboard/overview" : pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }
    } else {
      if (!gate.emailVerified && !pathname.startsWith("/auth/check-email") && !pathname.startsWith("/auth/verify-email")) {
        return NextResponse.redirect(new URL("/auth/check-email", request.url));
      }
      if (gate.emailVerified && !gate.mfaEnabled && !pathname.startsWith("/auth/mfa/setup")) {
        return NextResponse.redirect(new URL("/auth/mfa/setup", request.url));
      }
      if (
        gate.emailVerified &&
        gate.mfaEnabled &&
        !gate.onboardingComplete &&
        pathname.startsWith("/dashboard") &&
        !isOnboardingConfigPath(pathname)
      ) {
        return NextResponse.redirect(new URL(gate.nextPath, request.url));
      }
      if (gate.onboardingComplete && isPublicAuthPath(pathname)) {
        return NextResponse.redirect(
          new URL(gate.operationalUseAllowed ? "/dashboard/overview" : "/dashboard/billing", request.url),
        );
      }
      if (
        gate.emailVerified &&
        gate.mfaEnabled &&
        gate.onboardingComplete &&
        !gate.operationalUseAllowed &&
        pathname.startsWith("/dashboard") &&
        !isBillingGateAllowPath(pathname)
      ) {
        return NextResponse.redirect(new URL("/dashboard/billing", request.url));
      }
      if (
        gate.emailVerified &&
        gate.mfaEnabled &&
        !gate.onboardingComplete &&
        isPublicAuthPath(pathname)
      ) {
        return NextResponse.redirect(new URL(gate.nextPath, request.url));
      }
    }
  }

  // Legacy bookmark: /login → /auth/login
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname === "/") {
    if (!hasSession || !sessionToken) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    // Resolve gate so incomplete onboarding / billing hold skip a bounce via overview.
    const gate = await resolveGate(sessionToken);
    if (!gate) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (!gate.emailVerified) {
      return NextResponse.redirect(new URL("/auth/check-email", request.url));
    }
    if (!gate.mfaEnabled) {
      return NextResponse.redirect(new URL("/auth/mfa/setup", request.url));
    }
    if (!gate.onboardingComplete) {
      return NextResponse.redirect(new URL(gate.nextPath, request.url));
    }
    return NextResponse.redirect(
      new URL(gate.operationalUseAllowed ? "/dashboard/overview" : "/dashboard/billing", request.url),
    );
  }

  return NextResponse.next();
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
  ],
};
