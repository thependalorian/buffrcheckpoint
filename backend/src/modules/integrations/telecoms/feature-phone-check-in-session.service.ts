import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../../common/decorators/current-user.decorator";
import type { Database } from "../../../db/client";
import { DB } from "../../../db/db.module";
import {
  featurePhoneCheckInSessionStatusLog,
  featurePhoneCheckInSessions,
  telecommunicationsProviderArrangements,
} from "../../../db/schema";
import { CapabilityStatusService } from "../../capability-status/capability-status.service";

export interface UssdSessionInput {
  providerCode: string;
  carrierSessionReference: string;
  providerRequestId?: string;
  organisationId?: string;
  siteId?: string;
}

@Injectable()
export class FeaturePhoneCheckInSessionService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly capabilityStatus: CapabilityStatusService,
  ) {}

  private async logStatus(sessionId: string, statusCode: string, reason?: string) {
    await this.db.insert(featurePhoneCheckInSessionStatusLog).values({
      id: randomUUID(),
      sessionId,
      statusCode,
      reason: reason ?? null,
    });
  }

  async openSession(input: UssdSessionInput) {
    const arrangement = await this.db.query.telecommunicationsProviderArrangements.findFirst({
      where: eq(telecommunicationsProviderArrangements.providerCode, input.providerCode),
    });
    if (!arrangement?.active) {
      throw new BadRequestException("Telecom provider arrangement is not active");
    }

    if (!input.organisationId) {
      throw new BadRequestException("organisationId is required for USSD session routing");
    }

    const effectiveUser: AuthenticatedUser = {
      userId: "00000000-0000-0000-0000-000000000001",
      organisationId: input.organisationId,
      siteId: input.siteId ?? null,
      roleCode: "system",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
    };
    const effective = await this.capabilityStatus.listEffectiveForOrganisation(effectiveUser);
    if (effective.ussd !== "live") {
      throw new BadRequestException("USSD check-in is not enabled for this organisation");
    }

    const [created] = await this.db
      .insert(featurePhoneCheckInSessions)
      .values({
        id: randomUUID(),
        organisationId: input.organisationId,
        siteId: input.siteId ?? null,
        providerCode: input.providerCode,
        carrierSessionReference: input.carrierSessionReference,
        providerRequestId: input.providerRequestId ?? null,
        statusCode: "open",
      })
      .returning();

    await this.logStatus(created.id, "open", "provider_webhook_received");

    return {
      sessionId: created.id,
      statusCode: "unavailable" as const,
      message:
        "Feature-phone check-in session recorded. Live USSD menu flow ships after carrier acceptance testing.",
    };
  }

  async closeSession(sessionId: string, outcomeCode: string, visitId?: string) {
    const session = await this.db.query.featurePhoneCheckInSessions.findFirst({
      where: eq(featurePhoneCheckInSessions.id, sessionId),
    });
    if (!session) throw new NotFoundException("USSD session not found");

    await this.db
      .update(featurePhoneCheckInSessions)
      .set({
        statusCode: outcomeCode,
        closedAt: new Date(),
        visitId: visitId ?? session.visitId,
      })
      .where(eq(featurePhoneCheckInSessions.id, sessionId));

    await this.logStatus(sessionId, outcomeCode, "session_closed");
    return { sessionId, statusCode: outcomeCode };
  }
}
