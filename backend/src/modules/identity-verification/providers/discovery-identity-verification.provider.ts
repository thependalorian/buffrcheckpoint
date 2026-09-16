import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type {
  DigitalIdentityVerificationOutcome,
  DigitalIdentityVerificationProvider,
  DigitalIdentityVerificationRequest,
} from "./digital-identity-verification.provider";

@Injectable()
export class DiscoveryIdentityVerificationProvider implements DigitalIdentityVerificationProvider {
  async verifyVisitorIdentity(
    request: DigitalIdentityVerificationRequest,
  ): Promise<DigitalIdentityVerificationOutcome> {
    return {
      providerCode: "discovery",
      outcomeCode: "unavailable",
      assuranceLevelCode: request.requestedAssuranceLevelCode,
      providerVerificationReference: randomUUID(),
      verifiedAt: new Date().toISOString(),
      releasedAttributeCodes: [],
    };
  }
}
