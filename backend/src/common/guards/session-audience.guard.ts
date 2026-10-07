import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { audienceDecision } from "../auth/session-audience";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";

// Separates the ops and customer front doors (buffrcheckpoint.md §5.3): ops tokens only
// reach the ops surface, customer tokens never exercise platform.* permissions. Runs after
// JwtAuthGuard has populated request.user and before TenantScopeGuard / RbacGuard.
@Injectable()
export class SessionAudienceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; path?: string; url: string }>();
    const user = request.user;
    if (!user) return true; // JwtAuthGuard already rejects unauthenticated requests

    const permission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, targets);
    const decision = audienceDecision(user.audience, request.path ?? request.url, permission);
    if (!decision.allow) throw new ForbiddenException(decision.reason);
    return true;
  }
}
