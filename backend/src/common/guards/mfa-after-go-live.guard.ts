import { type CanActivate, type ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { MFA_SETUP_REQUIRED_MESSAGE, mfaSetupRequired } from "../auth/mfa-after-go-live";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

// Short cache so the check is one query per organisation every few seconds, not one per request. Tests set it to 0.
const liveCacheTtlMs = () => Number(process.env.MFA_GATE_CACHE_TTL_MS ?? 15_000);

// Once an organisation has finished onboarding (status "live"), every customer user must have MFA before the API serves anything
// but the account endpoints. During onboarding MFA is optional. The proxy in the admin app sends people to the setup page;
// this guard is the API-layer half, so a script holding a session token cannot skip it.
@Injectable()
export class MfaAfterGoLiveGuard implements CanActivate {
  private readonly liveCache = new Map<string, { live: boolean; at: number }>();

  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]))
      return true;
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; path?: string; url: string }>();
    const user = request.user;
    if (!user || user.mfaEnabled || user.audience !== "admin" || user.supportSessionId) return true;

    const organisationLive = await this.isLive(user.organisationId);
    const blocked = mfaSetupRequired({
      audience: user.audience,
      mfaEnabled: user.mfaEnabled,
      hasSupportSession: Boolean(user.supportSessionId),
      path: request.path ?? request.url,
      organisationLive,
    });
    if (blocked) throw new ForbiddenException(MFA_SETUP_REQUIRED_MESSAGE);
    return true;
  }

  private async isLive(organisationId: string): Promise<boolean> {
    const cached = this.liveCache.get(organisationId);
    const now = Date.now();
    if (cached && now - cached.at < liveCacheTtlMs()) return cached.live;
    const result = await this.db.execute(sql`
      SELECT 1
      FROM organisation_onboarding_states s
      JOIN type_definition t ON t.id = s.status_code
      WHERE s.organisation_id = ${organisationId} AND s.deleted_at IS NULL AND t.code = 'live'
      LIMIT 1
    `);
    const live = result.rows.length > 0;
    this.liveCache.set(organisationId, { live, at: now });
    return live;
  }
}
