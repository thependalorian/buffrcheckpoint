"use server";

import { redirect } from "next/navigation";

import {
  clearMfaChallengeCookie,
  clearMfaEnrollCookie,
  getMfaChallengeToken,
  getMfaEnrollToken,
  setMfaChallengeCookie,
  setMfaEnrollCookie,
  setSessionCookie,
} from "@/lib/auth/session";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:3001";

function nestMessage(body: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(body.message)) return body.message[0] ?? fallback;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Ops has its own front door (buffrcheckpoint.md §9.2a): platform_support only, MFA mandatory.
  const res = await fetch(`${BACKEND_API_URL}/auth/platform/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    return {
      error: nestMessage(
        errorBody,
        res.status === 429
          ? "Too many failed sign-in attempts. Wait a few minutes."
          : "Invalid email or password",
      ),
    };
  }

  const body = (await res.json()) as {
    accessToken?: string;
    mfaRequired?: boolean;
    mfaChallengeToken?: string;
    emailVerificationRequired?: boolean;
    mfaEnrollmentRequired?: boolean;
    enrollmentToken?: string;
  };

  if (body.emailVerificationRequired) {
    return { error: "Verify your email before using the ops console." };
  }

  if (body.mfaEnrollmentRequired && body.enrollmentToken) {
    await setMfaEnrollCookie(body.enrollmentToken);
    redirect("/login/mfa-setup");
  }

  if (body.mfaRequired && body.mfaChallengeToken) {
    await setMfaChallengeCookie(body.mfaChallengeToken);
    redirect("/login/mfa");
  }

  if (!body.accessToken) {
    return { error: "Login did not return a session — try again." };
  }

  await setSessionCookie(body.accessToken);
  redirect("/");
}

export async function mfaChallengeAction(formData: FormData): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  const recoveryCode = String(formData.get("recoveryCode") ?? "").trim();
  const challengeToken = await getMfaChallengeToken();

  if (!challengeToken) {
    return { error: "MFA challenge expired. Sign in again." };
  }
  if (!code && !recoveryCode) {
    return { error: "Enter an authenticator code or recovery code." };
  }

  const res = await fetch(`${BACKEND_API_URL}/auth/platform/mfa/challenge/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeToken,
      code: code || undefined,
      recoveryCode: recoveryCode || undefined,
    }),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    return { error: nestMessage(errorBody, "Invalid authenticator code") };
  }

  const payload = (await res.json()) as { accessToken?: string };
  if (!payload.accessToken) {
    return { error: "MFA succeeded but no session was returned." };
  }

  await clearMfaChallengeCookie();
  await setSessionCookie(payload.accessToken);
  redirect("/");
}

/** Forced staff MFA enrolment, step 1: fetch the authenticator secret for the enrolment token. */
export async function startMfaEnrollmentAction(): Promise<{ otpauthUrl?: string; secret?: string; error?: string }> {
  const token = await getMfaEnrollToken();
  if (!token) return { error: "Setup expired. Sign in again." };
  const res = await fetch(`${BACKEND_API_URL}/auth/mfa/enroll/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    return { error: nestMessage(errorBody, "Could not start authenticator setup. Sign in again.") };
  }
  const body = (await res.json()) as { otpauthUrl: string; secret: string };
  return { otpauthUrl: body.otpauthUrl, secret: body.secret };
}

/** Step 2: confirm the first code; the backend returns the ops session and recovery codes. */
export async function confirmMfaEnrollmentAction(
  formData: FormData,
): Promise<{ recoveryCodes?: string[]; error?: string }> {
  const token = await getMfaEnrollToken();
  if (!token) return { error: "Setup expired. Sign in again." };
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." };
  const res = await fetch(`${BACKEND_API_URL}/auth/mfa/enroll/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    return { error: nestMessage(errorBody, "Invalid authenticator code") };
  }
  const body = (await res.json()) as { accessToken?: string; recoveryCodes?: string[] };
  if (!body.accessToken) return { error: "MFA enabled but no session was returned. Sign in again." };
  await clearMfaEnrollCookie();
  await setSessionCookie(body.accessToken);
  return { recoveryCodes: body.recoveryCodes ?? [] };
}
