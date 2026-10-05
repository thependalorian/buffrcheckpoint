import { DiginamRelyingPartyVerificationProvider } from "./diginam-relying-party-verification.provider";
import type { DigitalIdentityVerificationRequest } from "./digital-identity-verification.provider";
import { DiscoveryIdentityVerificationProvider } from "./discovery-identity-verification.provider";

const sampleRequest: DigitalIdentityVerificationRequest = {
  organisationId: "00000000-0000-4000-8000-000000000001",
  visitId: "00000000-0000-4000-8000-000000000002",
  requestedAssuranceLevelCode: "V3",
  purposeCode: "site_access",
  relyingPartyReference: "buffr-checkpoint-test",
};

describe("identity verification providers (fail-closed until capability live)", () => {
  it("DigiNam provider always returns unavailable (never verified)", async () => {
    const provider = new DiginamRelyingPartyVerificationProvider();
    for (let i = 0; i < 5; i++) {
      const outcome = await provider.verifyVisitorIdentity(sampleRequest);
      expect(outcome.outcomeCode).toBe("unavailable");
      expect(outcome.providerCode).toBe("diginam");
      expect(outcome.releasedAttributeCodes).toEqual([]);
      expect(outcome.outcomeCode === "verified").toBe(false);
    }
  });

  it("Discovery provider always returns unavailable (never verified)", async () => {
    const provider = new DiscoveryIdentityVerificationProvider();
    for (let i = 0; i < 5; i++) {
      const outcome = await provider.verifyVisitorIdentity({
        ...sampleRequest,
        requestedAssuranceLevelCode: "V4",
      });
      expect(outcome.outcomeCode).toBe("unavailable");
      expect(outcome.providerCode).toBe("discovery");
      expect(outcome.releasedAttributeCodes).toEqual([]);
      expect(["verified", "not_verified", "expired"]).not.toContain(outcome.outcomeCode);
    }
  });
});
