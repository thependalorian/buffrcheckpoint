import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { isTokenRevoked, loadCredentialState } from "../../common/auth/credential-revocation";
import { deriveAudience } from "../../common/auth/session-audience";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { TokenIssuerService } from "./token-issuer.service";

/**
 * Turns a bearer token into the authenticated user, or refuses it with a plain 401.
 * Refused: a bad signature, the wrong issuer or algorithm, an expired token, a token issued before a credential change, and a token for a
 * user who no longer exists (SE-1, SE-4, SE-5, SE-6).
 */
@Injectable()
export class AccessTokenAuthenticator {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tokens: TokenIssuerService,
  ) {}

  async authenticate(token: string): Promise<AuthenticatedUser> {
    let payload: Awaited<ReturnType<TokenIssuerService["verify"]>>;
    try {
      payload = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    const claims = payload as unknown as {
      sub: string;
      organisationId: string;
      siteId: string | null;
      roleCode: string;
      permissions: string[];
      emailVerified: boolean;
      mfaEnabled?: boolean;
      supportSessionId?: string;
      supportGrantId?: string;
      aud?: string;
      iat?: number;
    };
    if (!claims.sub || !claims.organisationId) throw new UnauthorizedException();
    const state = await loadCredentialState(this.db, claims.sub, claims.organisationId);
    if (isTokenRevoked(claims.iat, state)) throw new UnauthorizedException();
    return {
      userId: claims.sub,
      organisationId: claims.organisationId,
      siteId: claims.siteId,
      roleCode: claims.roleCode,
      permissions: claims.permissions,
      emailVerified: claims.emailVerified,
      mfaEnabled: claims.mfaEnabled === true,
      supportSessionId: claims.supportSessionId,
      supportGrantId: claims.supportGrantId,
      audience: deriveAudience(claims),
      issuedAt: claims.iat,
    };
  }
}
