import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createHmac, randomUUID } from "node:crypto";

import type { Database } from "../../../db/client";
import { DB } from "../../../db/db.module";
import { smsContactConfirmationEvents, telecommunicationsProviderArrangements } from "../../../db/schema";
import { CapabilityStatusService } from "../../capability-status/capability-status.service";

export interface SmsContactConfirmationInput {
  organisationId: string;
  visitId?: string;
  siteId?: string;
  recipientReference: string;
  message: string;
}

@Injectable()
export class SmsContactConfirmationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly capabilityStatus: CapabilityStatusService,
  ) {}

  private recipientHmac(value: string): string {
    const pepper = process.env.PHONE_HASH_PEPPER ?? "dev-pepper";
    return createHmac("sha256", pepper).update(value.trim()).digest("hex");
  }

  async send(input: SmsContactConfirmationInput) {
    const effective = await this.capabilityStatus.listEffectiveForOrganisation({
      userId: "00000000-0000-0000-0000-000000000001",
      organisationId: input.organisationId,
      siteId: input.siteId ?? null,
      roleCode: "system",
      permissions: [],
      emailVerified: true,
      mfaEnabled: true,
      audience: "admin",
    });
    if (effective.smsContactConfirmation !== "live") {
      return this.recordOutcome(input, "capability_not_live", null);
    }

    const arrangement = await this.db.query.telecommunicationsProviderArrangements.findFirst({
      where: eq(telecommunicationsProviderArrangements.active, true),
    });

    if (!arrangement) {
      return this.recordOutcome(
        input,
        "provider_not_configured",
        null,
        "SMS contact confirmation gateway is not live until provider arrangement is approved.",
      );
    }

    return this.recordOutcome(
      input,
      "provider_not_live",
      arrangement.providerCode,
      "SMS adapter scaffold only — no live MT gateway until CRAN/provider evidence is recorded.",
    );
  }

  private async recordOutcome(
    input: SmsContactConfirmationInput,
    outcomeCode: string,
    providerCode: string | null,
    message?: string,
  ) {
    const messageReference = randomUUID();
    await this.db.insert(smsContactConfirmationEvents).values({
      id: randomUUID(),
      organisationId: input.organisationId,
      visitId: input.visitId ?? null,
      siteId: input.siteId ?? null,
      providerCode: providerCode ?? "unconfigured",
      recipientReferenceHmac: this.recipientHmac(input.recipientReference),
      messageReference,
      outcomeCode,
    });

    return {
      delivered: false,
      outcomeCode,
      messageReference,
      failureReason:
        message ??
        "SMS contact confirmation is scaffolded only until provider arrangement is approved.",
    };
  }
}
