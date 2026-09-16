import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type {
  DigitalIdentityVerificationOutcome,
  DigitalIdentityVerificationProvider,
  DigitalIdentityVerificationRequest,
} from "./digital-identity-verification.provider";

// Skeleton only — wired when platform capability status >= approved and
// CRAN relying-party onboarding note confirms the technical interface.
@Injectable()
export class DiginamRelyingPartyVerificationProvider implements DigitalIdentityVerificationProvider {
  async verifyVisitorIdentity(
    request: DigitalIdentityVerificationRequest,
  ): Promise<DigitalIdentityVerificationOutcome> {
    return {
      providerCode: "diginam",
      outcomeCode: "unavailable",
      assuranceLevelCode: request.requestedAssuranceLevelCode,
      providerVerificationReference: randomUUID(),
      verifiedAt: new Date().toISOString(),
      releasedAttributeCodes: [],
    };
  }
}
