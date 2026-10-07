import { Inject, Injectable, Optional } from "@nestjs/common";
import { eq } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { DB } from "../../../db/db.module";
import { smsContactConfirmationEvents, telecommunicationsProviderArrangements } from "../../../db/schema";
import { CapabilityStatusService } from "../../capability-status/capability-status.service";
import { BULKSMSNAM_PROVIDER_CODE, BulkSmsNamClient, SmsSendError } from "./bulksmsnam.client";
import { SmsEntitlementService } from "./sms-entitlement.service";
import { createHmac, randomUUID } from "node:crypto";

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
    @Optional() private readonly bulkSms: BulkSmsNamClient = new BulkSmsNamClient(),
    @Optional() private readonly entitlement: SmsEntitlementService = new SmsEntitlementService(db),
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

    if (arrangement.providerCode === BULKSMSNAM_PROVIDER_CODE && this.bulkSms.isConfigured()) {
      // A text costs money, so it needs the organisation's SMS add-on and a month under the safety limit. Refused before the provider is
      // called, so a refusal spends no credit.
      const entitlement = await this.entitlement.check(input.organisationId);
      if (!entitlement.allowed && entitlement.reason) {
        return this.recordOutcome(
          input,
          entitlement.reason,
          arrangement.providerCode,
          entitlement.reason === "addon_not_active"
            ? "Text messages need the SMS add-on on this organisation's subscription."
            : `The safety limit of ${entitlement.limit} texts for this month has been reached.`,
        );
      }
      try {
        const sent = await this.bulkSms.send(input.recipientReference, input.message);
        return this.recordOutcome(input, "sent", arrangement.providerCode, undefined, sent.providerReference);
      } catch (error) {
        // Only the error class is stored and returned: never the provider's body, the key, the number or the text.
        const code = error instanceof SmsSendError ? error.code : "provider_error";
        return this.recordOutcome(input, code, arrangement.providerCode, `SMS was not sent (${code}).`);
      }
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
    providerReference?: string,
  ) {
    const messageReference = providerReference ?? randomUUID();
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
      delivered: outcomeCode === "sent",
      outcomeCode,
      messageReference,
      failureReason:
        outcomeCode === "sent"
          ? undefined
          : (message ?? "SMS contact confirmation is scaffolded only until provider arrangement is approved."),
    };
  }
}
