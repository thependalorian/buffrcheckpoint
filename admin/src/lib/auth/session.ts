import { cookies } from "next/headers";

// Buffr Checkpoint session cookie. Holds the backend's JWT verbatim (see
// backend/src/modules/auth/auth.service.ts issueToken — sub/organisationId/
// siteId/roleCode/permissions/emailVerified). httpOnly + sameSite=lax so the
// token is never reachable from client-side JS (Section 13.1's hardening
// baseline) — every route handler and server component reads it from here,
// never from a client-visible cookie or localStorage.
const SESSION_COOKIE = "bc_session";
const REFRESH_COOKIE = "bc_refresh";
const MFA_CHALLENGE_COOKIE = "bc_mfa_challenge";
const MAX_AGE_SECONDS = 60 * 60 * 8; // matches backend JWT default expiry order of magnitude; tighten once backend sets an explicit expiresIn
/** Must stay <= backend MFA_CHALLENGE_TTL_MS (10 minutes). */
const MFA_CHALLENGE_MAX_AGE_SECONDS = 10 * 60;

/**
 * Stores the session. `refreshToken` replaces the refresh cookie when given, leaves it alone when omitted, and removes it when null
 * (a support session is not refreshable). The refresh cookie is httpOnly like the access cookie and is only ever sent to this app.
 */
export async function setSessionCookie(accessToken: string, refreshToken?: string | null): Promise<void> {
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
  else if (refreshToken === null) store.delete(REFRESH_COOKIE);
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

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;
export const SESSION_COOKIE_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
export const MFA_CHALLENGE_COOKIE_NAME = MFA_CHALLENGE_COOKIE;
