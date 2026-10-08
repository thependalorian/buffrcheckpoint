import { applyDecorators, BadRequestException, CanActivate, ExecutionContext, Injectable, UseGuards } from "@nestjs/common";

import { TurnstileService } from "./turnstile.service";

export const TURNSTILE_HEADER = "x-turnstile-token";

export const TURNSTILE_REFUSED = "Complete the check below the form and try again.";

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.turnstile.isEnabled()) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const raw = request.headers[TURNSTILE_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if ((await this.turnstile.verify(token)) === "failed") throw new BadRequestException(TURNSTILE_REFUSED);
    return true;
  }
}

/** Put on a public route that a bot would abuse: sign-up, sign-in, password reset, contact. Visitor check-in never carries it. */
export const RequireTurnstile = () => applyDecorators(UseGuards(TurnstileGuard));
