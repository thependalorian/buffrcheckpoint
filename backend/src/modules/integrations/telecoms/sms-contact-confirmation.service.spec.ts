import { SmsContactConfirmationService } from "./sms-contact-confirmation.service";

describe("SmsContactConfirmationService", () => {
  const organisationId = "org-1";

  it("records capability_not_live without storing raw recipient phone", async () => {
    const inserted: Record<string, unknown>[] = [];
    const db = {
      query: {
        telecommunicationsProviderArrangements: { findFirst: jest.fn() },
      },
      insert: jest.fn(() => ({
        values: (row: Record<string, unknown>) => {
          inserted.push(row);
          return Promise.resolve();
        },
      })),
    };
    const capabilityStatus = {
      listEffectiveForOrganisation: jest.fn().mockResolvedValue({
        smsContactConfirmation: "not_available",
      }),
    };

    const service = new SmsContactConfirmationService(db as never, capabilityStatus as never);
    const result = await service.send({
      organisationId,
      recipientReference: "+264811234567",
      message: "Your host is ready",
    });

    expect(result.delivered).toBe(false);
    expect(result.outcomeCode).toBe("capability_not_live");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.recipientReferenceHmac).toEqual(expect.any(String));
    expect(JSON.stringify(inserted[0])).not.toContain("+264811234567");
    expect(JSON.stringify(inserted[0])).not.toContain("Your host is ready");
  });

  it("records provider_not_configured when capability is live but no arrangement exists", async () => {
    const inserted: Record<string, unknown>[] = [];
    const db = {
      query: {
        telecommunicationsProviderArrangements: {
          findFirst: jest.fn().mockResolvedValue(undefined),
        },
      },
      insert: jest.fn(() => ({
        values: (row: Record<string, unknown>) => {
          inserted.push(row);
          return Promise.resolve();
        },
      })),
    };
    const capabilityStatus = {
      listEffectiveForOrganisation: jest.fn().mockResolvedValue({
        smsContactConfirmation: "live",
      }),
    };

    const service = new SmsContactConfirmationService(db as never, capabilityStatus as never);
    const result = await service.send({
      organisationId,
      recipientReference: "+264811111111",
      message: "ignored",
    });

    expect(result.outcomeCode).toBe("provider_not_configured");
    expect(inserted[0]?.providerCode).toBe("unconfigured");
  });
});
