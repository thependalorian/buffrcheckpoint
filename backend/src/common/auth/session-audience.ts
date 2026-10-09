/**
 * Session audience (JWT `aud`): which front door issued a token and what it may call.
 *
 *  - "admin":      customer admin / kiosk logins (POST /auth/login) and ops-minted support
 *                  sessions. Never allowed to exercise a platform.* permission.
 *  - "ops":        platform staff logins (POST /auth/platform/login), always MFA-verified.
 *                  Only allowed on the ops surface paths below.
 *  - "ops_enroll": short-lived token a staff member gets before MFA is enrolled. Only
 *                  allowed to enrol MFA and read /auth/me.
 */
export type SessionAudience = "admin" | "ops" | "ops_enroll";

/** How long a sign-in lasts per surface in seconds. This is the refresh-token life (SE-3); the access token itself lives for `accessTokenTtlSeconds`. */
export const OPS_SESSION_SECONDS = 2 * 3600;
export const ADMIN_SESSION_SECONDS = 8 * 3600;
/** The enrolment token is not refreshable and lasts 15 minutes. */
export const OPS_ENROLL_SECONDS = 15 * 60;

/**
 * Access token lifetime. SE-2 sets 15 minutes (900) once the admin and ops apps refresh through POST /auth/refresh.
 * Until ACCESS_TOKEN_TTL_SECONDS is set, a token lasts the whole session, as it did before refresh tokens existed.
 */
export function accessTokenTtlSeconds(audience: "admin" | "ops", env: NodeJS.ProcessEnv = process.env): number {
  const session = audience === "ops" ? OPS_SESSION_SECONDS : ADMIN_SESSION_SECONDS;
  const configured = Number(env.ACCESS_TOKEN_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, session) : session;
}

/** Backend paths the Platform Ops Console calls (checked against ops-console/src on 2026-09-29). */
const OPS_PATH_PREFIXES = [
  "/platform/",
  "/type-definitions",
  "/capability-status",
  "/public/",
  "/health",
  "/auth/me",
  "/auth/platform/",
  "/auth/mfa/enroll/",
] as const;

const OPS_ENROLL_PATHS = ["/auth/mfa/enroll/start", "/auth/mfa/enroll/confirm", "/auth/me"] as const;

/**
 * Tokens issued before `aud` existed: staff sessions (platform_support, not a support
 * session) are treated as ops, everything else as admin. Lets the rollout avoid logging
 * anyone out; those tokens expire within 8h.
 */
export function deriveAudience(payload: {
  aud?: unknown;
  roleCode: string;
  supportSessionId?: string;
}): SessionAudience {
  if (payload.aud === "admin" || payload.aud === "ops" || payload.aud === "ops_enroll") return payload.aud;
  return payload.roleCode === "platform_support" && !payload.supportSessionId ? "ops" : "admin";
}

function stripQuery(path: string): string {
  const i = path.indexOf("?");
  return i === -1 ? path : path.slice(0, i);
}

export type AudienceDecision = { allow: true } | { allow: false; reason: string };

export function audienceDecision(
  audience: SessionAudience,
  rawPath: string,
  requiredPermission: string | undefined,
): AudienceDecision {
  const path = stripQuery(rawPath);
  if (audience === "ops_enroll") {
    return OPS_ENROLL_PATHS.some((p) => path === p)
      ? { allow: true }
      : { allow: false, reason: "Enrol authenticator MFA before using the ops console" };
  }
  if (audience === "ops") {
    return OPS_PATH_PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p))
      ? { allow: true }
      : { allow: false, reason: "Ops sessions cannot call customer routes" };
  }
  if (requiredPermission?.startsWith("platform.")) {
    return { allow: false, reason: "This route requires an ops session" };
  }
  return { allow: true };
}
