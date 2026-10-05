import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { DB } from "../../../db/db.module";
import { telecommunicationsProviderArrangements } from "../../../db/schema";
import { createHmac, timingSafeEqual } from "node:crypto";

@Injectable()
export class TelecomWebhookGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      body: Record<string, unknown>;
      ip?: string;
      params?: { providerCode?: string };
    }>();

    const providerCode = request.params?.providerCode;
    if (!providerCode) {
      throw new BadRequestException("Provider code is required");
    }

    const arrangement = await this.db.query.telecommunicationsProviderArrangements.findFirst({
      where: eq(telecommunicationsProviderArrangements.providerCode, providerCode),
    });
    if (!arrangement?.active) {
      throw new ForbiddenException("Telecom provider arrangement is not active");
    }

    const signature = request.headers["x-telecom-signature"];
    const envSecret = process.env.TELECOM_WEBHOOK_SECRET ?? "";
    const secret = arrangement.webhookSecretRef ?? envSecret;
    if (!secret) {
      throw new ForbiddenException("Telecom webhook not configured");
    }
    if (!signature) {
      throw new UnauthorizedException("Missing webhook signature");
    }

    if (arrangement.allowedSourceIps?.length) {
      const sourceIp = request.ip ?? request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
      if (sourceIp && !arrangement.allowedSourceIps.includes(sourceIp)) {
        throw new ForbiddenException("Source IP not allowed for provider");
      }
    }

    const payload = JSON.stringify(request.body ?? {});
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const provided = signature.replace(/^sha256=/, "");
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    const replayHeader = request.headers["x-provider-request-id"];
    if (!replayHeader) {
      throw new UnauthorizedException("Missing provider request identifier");
    }

    return true;
  }
}
