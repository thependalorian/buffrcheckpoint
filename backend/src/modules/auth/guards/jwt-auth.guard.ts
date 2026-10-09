import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../../../common/decorators/public.decorator";
import { AccessTokenAuthenticator } from "../access-token-authenticator.service";

/**
 * Populates request.user from the verified bearer token. Applied globally in app.module.ts so every route requires auth unless it is
 * explicitly marked @Public(). Verification, issuer check and revocation live in AccessTokenAuthenticator.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticator: AccessTokenAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
    if (!token) throw new UnauthorizedException();
    request.user = await this.authenticator.authenticate(token);
    return true;
  }
}
