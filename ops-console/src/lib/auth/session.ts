import { cookies } from "next/headers";

const SESSION_COOKIE = "bc_ops_session";
const MFA_CHALLENGE_COOKIE = "bc_ops_mfa_challenge";
const MAX_AGE_SECONDS = 60 * 60 * 8;
const MFA_CHALLENGE_MAX_AGE_SECONDS = 10 * 60;

export async function setSessionCookie(accessToken: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
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
