export type DigitalIdentityOutcomeCode = "verified" | "not_verified" | "unavailable" | "expired";

export interface DigitalIdentityVerificationRequest {
  organisationId: string;
  visitId: string;
  requestedAssuranceLevelCode: string;
  purposeCode: string;
  relyingPartyReference: string;
}

export interface DigitalIdentityVerificationOutcome {
  providerCode: string;
  outcomeCode: DigitalIdentityOutcomeCode;
  assuranceLevelCode: string;
  providerVerificationReference: string;
  verifiedAt: string;
  expiresAt?: string;
  releasedAttributeCodes: string[];
}

export interface DigitalIdentityVerificationProvider {
  verifyVisitorIdentity(request: DigitalIdentityVerificationRequest): Promise<DigitalIdentityVerificationOutcome>;
}

export const DIGITAL_IDENTITY_PROVIDER = Symbol("DIGITAL_IDENTITY_PROVIDER");
