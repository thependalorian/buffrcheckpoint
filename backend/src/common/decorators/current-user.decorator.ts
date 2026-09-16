import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  userId: string;
  organisationId: string;
  siteId: string | null;
  roleCode: string;
  permissions: string[];
  emailVerified: boolean;
  mfaEnabled: boolean;
  /**
   * Set only on a Platform Ops Console support-session token (see
   * support-sessions.service.ts) — never on a normal login session.
   * organisationId on such a token is the *target* customer org being
   * acted on, not the platform user's own home org. RbacGuard's
   * platform_support branch only requires a matching active grant when
   * this is set; routine platform-wide actions (dashboard, CRM, billing,
   * incidents) never carry it and need no grant.
   */
  supportSessionId?: string;
  supportGrantId?: string;
}

// Populated by JwtAuthGuard (modules/auth/guards/jwt-auth.guard.ts) from the
// verified session token — never trust a client-supplied organisationId.
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthenticatedUser;
});
