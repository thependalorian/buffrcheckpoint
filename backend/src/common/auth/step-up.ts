import { ForbiddenException } from "@nestjs/common";

import type { AuthenticatedUser } from "../decorators/current-user.decorator";

/** How recent a sign-in must be for an irreversible action. */
export const STEP_UP_MAX_AGE_SECONDS = 15 * 60;

/** True when the session began recently enough. A token without an issue time is never fresh. */
export function isFreshSession(
  user: Pick<AuthenticatedUser, "issuedAt">,
  nowMs: number = Date.now(),
  maxAgeSeconds: number = STEP_UP_MAX_AGE_SECONDS,
): boolean {
  return user.issuedAt !== undefined && nowMs / 1000 - user.issuedAt <= maxAgeSeconds;
}

/**
 * Refuses an irreversible action unless the person signed in within the last 15 minutes (DL-3, MF-4).
 * The 403 carries a stable code so the app can send the person to sign in again.
 */
export function assertFreshSession(user: Pick<AuthenticatedUser, "issuedAt">, nowMs: number = Date.now()): void {
  if (!isFreshSession(user, nowMs)) {
    throw new ForbiddenException({
      statusCode: 403,
      error: "Forbidden",
      code: "step_up_required",
      message: "Sign in again to confirm this action.",
    });
  }
}
