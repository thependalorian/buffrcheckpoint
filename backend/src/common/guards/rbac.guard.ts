import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { and, eq, gt, isNull, lte } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { privilegedAccessGrants } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { ScopedPermissionEvaluationService } from "../access-control/scoped-permission-evaluation.service";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";
import { REQUIRE_VERIFIED_EMAIL_KEY } from "../decorators/require-verified-email.decorator";
import { REQUIRE_MFA_KEY } from "../decorators/require-mfa.decorator";

// Section 9.2 rule 1: "Enforce access in the database and API layer, not
// only in the web interface." This guard is the API-layer half of that
// rule — it re-checks permission on every request regardless of what the
// admin app's sidebar chose to show.
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
    private readonly permissionEvaluation: ScopedPermissionEvaluationService,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true; // route opted out of permission checking explicitly
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException("No authenticated user on request");
    }

    if (!(await this.permissionEvaluation.roleHasPermission(user.roleCode, requiredPermission))) {
      throw new ForbiddenException(`Role '${user.roleCode}' lacks permission '${requiredPermission}'`);
    }

    // Section 9.2 rule 4: platform_support's access is break-glass —
    // "exceptional, time-bound... fully logged," never a standing
    // credential — but only for actions taken *under an active support
    // session* (user.supportSessionId set, minted by
    // support-sessions.service.ts against a specific target org). Routine
    // platform-wide actions (dashboard/CRM/billing/incidents/tickets — the
    // Ops Console's own internal work, not "acting as a customer org")
    // never carry a supportSessionId and need no grant at all; gating
    // those on a grant would make the console's own basic screens
    // unusable. When a support session IS present, the backing grant must
    // still be active AND scoped to the exact org the session targets —
    // a prior version of this check only verified *some* grant existed
    // for the user, which would have let an active grant for Org A
    // authorize an action against Org B.
    //
    // IMPORTANT: check user.supportSessionId alone, NOT
    // user.roleCode === "platform_support" — a minted support-session JWT
    // deliberately sets roleCode to the acting-as role (owner_operator, to
    // grant full edit access per the product decision), so the platform
    // user's own role_code is no longer "platform_support" once a session
    // is active. Gating on role_code here (an earlier version of this
    // guard did) meant this whole re-check silently never ran for any
    // support-session request — caught by a live end-to-end test
    // (revoke a grant, confirm the still-held session token gets 403'd)
    // before this shipped, not in production.
    if (user.supportSessionId) {
      const now = new Date();
      // v0.24 consent gate: the grant must carry the explicit 'active'
      // status_code (set only once the target org's own admin approves
      // it — see support-sessions.service.ts approveGrant()), not merely
      // "not revoked and inside a time window." A pending/denied/expired
      // grant never reaches 'active', so this alone is sufficient, but the
      // time-window check stays too as defense in depth.
      const activeStatus = await this.typeDefs.id("privileged_access_grant_status", "active");
      const activeGrant = await this.db.query.privilegedAccessGrants.findFirst({
        where: and(
          eq(privilegedAccessGrants.id, user.supportGrantId ?? ""),
          eq(privilegedAccessGrants.grantedToUserId, user.userId),
          eq(privilegedAccessGrants.organisationId, user.organisationId),
          eq(privilegedAccessGrants.statusCode, activeStatus),
          isNull(privilegedAccessGrants.revokedAt),
          isNull(privilegedAccessGrants.deletedAt),
          lte(privilegedAccessGrants.startsAt, now),
          gt(privilegedAccessGrants.expiresAt, now),
        ),
      });
      if (!activeGrant) {
        throw new ForbiddenException("Support-session grant is no longer active for this organisation");
      }
    }

    // Verified email is required for privileged actions.
    const requiresVerifiedEmail = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_VERIFIED_EMAIL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiresVerifiedEmail && !user.emailVerified) {
      throw new ForbiddenException("This action requires a verified email address");
    }

    const requiresMfa = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiresMfa && !user.mfaEnabled) {
      throw new ForbiddenException("This action requires multi-factor authentication");
    }

    return true;
  }
}
