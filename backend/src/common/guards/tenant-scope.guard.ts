import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedUser } from "../decorators/current-user.decorator";
import { PLATFORM_SCOPED_KEY } from "../decorators/platform-scoped.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Section 9.2 rule 5: "Site Managers cannot access another site merely by
// changing a URL or API request." This guard checks any :organisationId or
// :siteId route/query param against the caller's own token claims — it does
// NOT trust a client-supplied organisationId to scope a query. Services
// (e.g. VisitsService) additionally always filter by request.user.organisationId
// directly, so this guard is a defense-in-depth check on top of that, not
// the only enforcement point.
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; // no request.user exists yet for a public route — nothing to scope-check

    const isPlatformScoped = this.reflector.getAllAndOverride<boolean>(PLATFORM_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPlatformScoped) return true; // Platform Ops Console cross-org route — see platform-scoped.decorator.ts

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException("No authenticated user on request");
    }

    const requestedOrgId = request.params?.organisationId ?? request.query?.organisationId;
    if (requestedOrgId && requestedOrgId !== user.organisationId) {
      throw new ForbiddenException("Cannot access another organisation's data");
    }

    const requestedSiteId = request.params?.siteId ?? request.query?.siteId;
    // A null user.siteId means org-wide access (e.g. Regional Manager,
    // Compliance/Audit Officer, Section 9.1) — only block a mismatched site
    // when the caller is scoped to one specific site.
    if (requestedSiteId && user.siteId && requestedSiteId !== user.siteId) {
      throw new ForbiddenException("Cannot access another site's data");
    }

    return true;
  }
}
