import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { deriveAudience } from "../../../common/auth/session-audience";
import type { AuthenticatedUser } from "../../../common/decorators/current-user.decorator";

interface JwtPayload {
  sub: string;
  organisationId: string;
  siteId: string | null;
  roleCode: string;
  permissions: string[];
  emailVerified: boolean;
  mfaEnabled?: boolean;
  /** Platform Ops Console support-session claims — see support-sessions.service.ts. */
  supportSessionId?: string;
  supportGrantId?: string;
  /** Session audience; absent on tokens issued before 2026-09-29 (derived instead). */
  aud?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set — add it to backend/.env before starting the server.");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      organisationId: payload.organisationId,
      siteId: payload.siteId,
      roleCode: payload.roleCode,
      permissions: payload.permissions,
      emailVerified: payload.emailVerified,
      mfaEnabled: payload.mfaEnabled === true,
      supportSessionId: payload.supportSessionId,
      supportGrantId: payload.supportGrantId,
      audience: deriveAudience(payload),
    };
  }
}
