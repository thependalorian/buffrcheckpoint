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
];

function backendBaseUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

async function resolveGate(token: string): Promise<{
  emailVerified: boolean;
  mfaEnabled: boolean;
  onboardingComplete: boolean;
  nextPath: string;
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
    };
    return {
      emailVerified: me.user?.emailVerified === true,
      mfaEnabled: me.user?.mfaEnabled === true,
      onboardingComplete: me.onboarding?.complete === true,
      nextPath: me.onboarding?.nextPath ?? "/onboarding",
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
    if (gate) {
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
        return NextResponse.redirect(new URL("/dashboard/default", request.url));
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

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/dashboard/default" : "/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/auth/login",
    "/auth/register",
    "/auth/check-email",
    "/auth/verify-email",
    "/auth/mfa/:path*",
  ],
};
