import { eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import { applicationUsers, typeDefinition } from "../../db/schema";
import { sessionCache } from "./session-cache";

/** What the API needs to know about a user to decide whether a still-unexpired token may be used. */
export interface CredentialState {
  /** False when the user row is missing, soft-deleted or closing (closure and deletion revoke access at once, SE-6, DL-5). */
  active: boolean;
  credentialsChangedAt: Date | null;
}

/**
 * Decides whether a token is refused because it predates a credential change or the user is gone (SE-4, SE-6).
 *
 * @param issuedAtSeconds - The token's `iat` claim in Unix seconds. A token without one is treated as issued before any change.
 * @param state - The user's current state, or null when the row does not exist.
 *
 * Token times have one-second resolution, so a token issued in the same second as the change is accepted: a session started
 * straight after a reset must keep working.
 */
export function isTokenRevoked(issuedAtSeconds: number | undefined, state: CredentialState | null): boolean {
  if (!state?.active) return true;
  if (!state.credentialsChangedAt) return false;
  if (issuedAtSeconds === undefined) return true;
  return issuedAtSeconds < Math.floor(state.credentialsChangedAt.getTime() / 1000);
}

/** Reads the user's credential state, cached for a short time and cleared by {@link markCredentialsChanged}. */
export function loadCredentialState(
  db: Database,
  userId: string,
  organisationId: string,
): Promise<CredentialState | null> {
  return sessionCache.getOrLoad("credential-state", userId, organisationId, async () => {
    const [row] = await db
      .select({
        deletedAt: applicationUsers.deletedAt,
        credentialsChangedAt: applicationUsers.credentialsChangedAt,
        status: typeDefinition.code,
      })
      .from(applicationUsers)
      .leftJoin(typeDefinition, eq(typeDefinition.id, applicationUsers.statusCode))
      .where(eq(applicationUsers.id, userId));
    // A closing account (a deletion request was accepted) is refused at once (DL-5), not only when the erasure finishes.
    return row
      ? { active: row.deletedAt === null && row.status !== "closing", credentialsChangedAt: row.credentialsChangedAt }
      : null;
  });
}

/**
 * Records that a user's credentials or access changed now, so every older token is refused on its next request.
 * Writes the column and drops the cached state in this process.
 */
export async function markCredentialsChanged(db: Database, userId: string, now = new Date()): Promise<void> {
  await db.update(applicationUsers).set({ credentialsChangedAt: now }).where(eq(applicationUsers.id, userId));
  sessionCache.invalidateUser(userId);
}
