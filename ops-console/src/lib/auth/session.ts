import { cookies } from "next/headers";

const SESSION_COOKIE = "bc_ops_session";
const REFRESH_COOKIE = "bc_ops_refresh";
const MFA_CHALLENGE_COOKIE = "bc_ops_mfa_challenge";
const MFA_ENROLL_COOKIE = "bc_ops_mfa_enroll";
// Ops sessions last 2h (backend OPS_SESSION_TTL); the enrolment token 15m (OPS_ENROLL_TTL).
const MAX_AGE_SECONDS = 60 * 60 * 2;
const MFA_ENROLL_MAX_AGE_SECONDS = 15 * 60;
const MFA_CHALLENGE_MAX_AGE_SECONDS = 10 * 60;

/** Stores the ops session. The refresh cookie is httpOnly like the access cookie and replaces the previous one when given. */
export async function setSessionCookie(accessToken: string, refreshToken?: string): Promise<void> {
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
  store.set(SESSION_COOKIE, accessToken, options);
  if (refreshToken) store.set(REFRESH_COOKIE, refreshToken, options);
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function setMfaChallengeCookie(challengeToken: string): Promise<void> {
  const store = await cookies();
  store.set(MFA_CHALLENGE_COOKIE, challengeToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MFA_CHALLENGE_MAX_AGE_SECONDS,
  });
}

export async function getMfaChallengeToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(MFA_CHALLENGE_COOKIE)?.value;
}

export async function clearMfaChallengeCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MFA_CHALLENGE_COOKIE);
}

export async function setMfaEnrollCookie(enrollmentToken: string): Promise<void> {
  const store = await cookies();
  store.set(MFA_ENROLL_COOKIE, enrollmentToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MFA_ENROLL_MAX_AGE_SECONDS,
  });
}

export async function getMfaEnrollToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(MFA_ENROLL_COOKIE)?.value;
}

export async function clearMfaEnrollCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MFA_ENROLL_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;
export const SESSION_COOKIE_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
