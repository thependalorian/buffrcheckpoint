"use server";

import { redirect } from "next/navigation";

import {
  clearMfaChallengeCookie,
  getMfaChallengeToken,
  setMfaChallengeCookie,
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

  const res = await fetch(`${BACKEND_API_URL}/auth/login`, {
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
  };

  if (body.emailVerificationRequired) {
    return { error: "Verify your email before using the ops console." };
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

  const res = await fetch(`${BACKEND_API_URL}/auth/mfa/challenge/verify`, {
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
