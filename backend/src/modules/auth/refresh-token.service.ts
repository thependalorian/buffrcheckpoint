import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import { isTokenRevoked, loadCredentialState, markCredentialsChanged } from "../../common/auth/credential-revocation";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { authRefreshToken, authRefreshTokenStatusLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { createHash, randomBytes, randomUUID } from "node:crypto";

export type RefreshAudience = "admin" | "ops";

/** How long a sign-in can keep refreshing: the session length of each surface (SE-3). */
export const REFRESH_LIFETIME_SECONDS: Record<RefreshAudience, number> = { admin: 8 * 3600, ops: 2 * 3600 };

const REFUSED = "Invalid or expired session";

export interface RotatedRefreshToken {
  userId: string;
  organisationId: string;
  audience: RefreshAudience;
  /** The replacement token to hand to the client. */
  refreshToken: string;
}

/** The token the client holds is `<organisation id>.<64 hex characters>`; only the hash of the hex part is stored. */
function split(raw: string): { organisationId: string; secret: string } | null {
  const [organisationId, secret, extra] = raw.split(".");
  if (extra !== undefined || !organisationId || !secret) return null;
  if (!/^[0-9a-f-]{36}$/i.test(organisationId) || !/^[0-9a-f]{64}$/.test(secret)) return null;
  return { organisationId, secret };
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Rotating refresh tokens with reuse detection (SE-2).
 * Each token is 32 random bytes, stored only as a hash, and works once. Presenting a token that was already used means a copy
 * exists somewhere it should not, so every token in the chain is revoked and every older access token is refused.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  /**
   * Starts a refresh chain for a new sign-in.
   *
   * @param familyId - Pass the chain being continued; omit to start a new one.
   * @returns The raw token for the client. It is not stored and cannot be read back.
   */
  async issue(userId: string, organisationId: string, audience: RefreshAudience, familyId?: string): Promise<string> {
    const secret = randomBytes(32).toString("hex");
    const now = new Date();
    const id = randomUUID();
    const active = await this.typeDefs.id("refresh_token_status", "active");
    await this.db.insert(authRefreshToken).values({
      id,
      organisationId,
      userId,
      familyId: familyId ?? randomUUID(),
      tokenHash: hashSecret(secret),
      statusCode: active,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_LIFETIME_SECONDS[audience] * 1000),
    });
    await this.log(organisationId, id, null, active, "issued");
    return `${organisationId}.${secret}`;
  }

  /**
   * Exchanges a refresh token for its replacement. The old token becomes `used`.
   * Throws a uniform 401 for an unknown, expired, revoked or reused token; a reused token also revokes the chain.
   */
  async rotate(
    raw: string,
    audienceOf: (userId: string) => Promise<RefreshAudience | null>,
  ): Promise<RotatedRefreshToken> {
    const parts = split(raw);
    if (!parts) throw new UnauthorizedException(REFUSED);
    const row = await this.db.query.authRefreshToken.findFirst({
      where: and(
        eq(authRefreshToken.organisationId, parts.organisationId),
        eq(authRefreshToken.tokenHash, hashSecret(parts.secret)),
        isNull(authRefreshToken.deletedAt),
      ),
    });
    if (!row) throw new UnauthorizedException(REFUSED);

    const status = await this.typeDefs.codeById(row.statusCode);
    if (status === "used") {
      await this.revokeFamily(row.organisationId, row.familyId, "reuse_detected");
      await markCredentialsChanged(this.db, row.userId);
      await appendAuditEvent(this.db, {
        organisationId: row.organisationId,
        actorId: row.userId,
        actionCode: "auth.refresh_token_reuse_detected",
        resourceType: "auth_refresh_token",
        resourceId: row.id,
      });
      throw new UnauthorizedException(REFUSED);
    }
    if (status !== "active" || row.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException(REFUSED);

    const state = await loadCredentialState(this.db, row.userId, row.organisationId);
    if (isTokenRevoked(Math.floor(row.issuedAt.getTime() / 1000), state)) throw new UnauthorizedException(REFUSED);
    const audience = await audienceOf(row.userId);
    if (!audience) throw new UnauthorizedException(REFUSED);

    // Claim the token with a conditional update so two simultaneous exchanges cannot both win.
    const used = await this.typeDefs.id("refresh_token_status", "used");
    const active = await this.typeDefs.id("refresh_token_status", "active");
    const claimed = await this.db
      .update(authRefreshToken)
      .set({ statusCode: used })
      .where(and(eq(authRefreshToken.id, row.id), eq(authRefreshToken.statusCode, active)))
      .returning({ id: authRefreshToken.id });
    if (claimed.length === 0) {
      await this.revokeFamily(row.organisationId, row.familyId, "reuse_detected");
      throw new UnauthorizedException(REFUSED);
    }
    await this.log(row.organisationId, row.id, active, used, "rotated");

    const refreshToken = await this.issue(row.userId, row.organisationId, audience, row.familyId);
    return { userId: row.userId, organisationId: row.organisationId, audience, refreshToken };
  }

  /** Revokes every live token in one chain. */
  async revokeFamily(organisationId: string, familyId: string, reasonCode: string): Promise<number> {
    return this.revokeWhere(
      and(eq(authRefreshToken.organisationId, organisationId), eq(authRefreshToken.familyId, familyId)),
      organisationId,
      reasonCode,
    );
  }

  /** Revokes every live token of a user: sign-out everywhere, deletion acceptance and credential changes (SE-6). */
  async revokeAllForUser(organisationId: string, userId: string, reasonCode: string): Promise<number> {
    return this.revokeWhere(
      and(eq(authRefreshToken.organisationId, organisationId), eq(authRefreshToken.userId, userId)),
      organisationId,
      reasonCode,
    );
  }

  private async revokeWhere(
    scope: ReturnType<typeof and>,
    organisationId: string,
    reasonCode: string,
  ): Promise<number> {
    const [active, used, revoked] = await Promise.all([
      this.typeDefs.id("refresh_token_status", "active"),
      this.typeDefs.id("refresh_token_status", "used"),
      this.typeDefs.id("refresh_token_status", "revoked"),
    ]);
    const rows = await this.db
      .select({ id: authRefreshToken.id, statusCode: authRefreshToken.statusCode })
      .from(authRefreshToken)
      .where(and(scope, isNull(authRefreshToken.deletedAt), inArray(authRefreshToken.statusCode, [active, used])));
    for (const row of rows) {
      await this.db.update(authRefreshToken).set({ statusCode: revoked }).where(eq(authRefreshToken.id, row.id));
      await this.log(organisationId, row.id, row.statusCode, revoked, reasonCode);
    }
    return rows.length;
  }

  private async log(
    organisationId: string,
    refreshTokenId: string,
    from: string | null,
    to: string,
    reasonCode: string,
  ): Promise<void> {
    await this.db.insert(authRefreshTokenStatusLog).values({
      id: randomUUID(),
      organisationId,
      refreshTokenId,
      fromStatusCode: from,
      toStatusCode: to,
      reasonCode,
    });
  }
}
