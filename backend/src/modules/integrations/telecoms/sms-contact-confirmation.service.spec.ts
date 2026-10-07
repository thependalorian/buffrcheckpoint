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

  describe("with the BulkSMS Namibia provider live", () => {
    function setup(bulkSms: { isConfigured: () => boolean; send: jest.Mock }) {
      const inserted: Record<string, unknown>[] = [];
      const db = {
        query: {
          telecommunicationsProviderArrangements: {
            findFirst: jest.fn().mockResolvedValue({ providerCode: "bulksmsnam", active: true }),
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
        listEffectiveForOrganisation: jest.fn().mockResolvedValue({ smsContactConfirmation: "live" }),
      };
      const service = new SmsContactConfirmationService(db as never, capabilityStatus as never, bulkSms as never);
      return { service, inserted };
    }

    it("sends, records the provider message id, and stores no number or text", async () => {
      const send = jest.fn().mockResolvedValue({ delivered: true, providerReference: "ATXid_1", creditsRemaining: 8 });
      const { service, inserted } = setup({ isConfigured: () => true, send });
      const result = await service.send({
        organisationId: "org-1",
        recipientReference: "+264814376206",
        message: "Your host is ready",
      });
      expect(send).toHaveBeenCalledWith("+264814376206", "Your host is ready");
      expect(result).toMatchObject({ delivered: true, outcomeCode: "sent", messageReference: "ATXid_1" });
      expect(result.failureReason).toBeUndefined();
      expect(inserted[0]).toMatchObject({
        providerCode: "bulksmsnam",
        outcomeCode: "sent",
        messageReference: "ATXid_1",
      });
      expect(JSON.stringify(inserted[0])).not.toContain("264814376206");
      expect(JSON.stringify(inserted[0])).not.toContain("Your host is ready");
    });

    it("records a provider failure as not delivered, with only the error class", async () => {
      const { SmsSendError } = jest.requireActual("./bulksmsnam.client");
      const send = jest
        .fn()
        .mockRejectedValue(new SmsSendError("BulkSMS Namibia rejected the message (HTTP 402)", "provider_rejected"));
      const { service, inserted } = setup({ isConfigured: () => true, send });
      const result = await service.send({
        organisationId: "org-1",
        recipientReference: "+264814376206",
        message: "Hi",
      });
      expect(result).toMatchObject({ delivered: false, outcomeCode: "provider_rejected" });
      expect(inserted[0]).toMatchObject({ outcomeCode: "provider_rejected" });
      expect(result.failureReason).not.toContain("402");
    });

    it("stays at provider_not_live when no key is configured and never calls the provider", async () => {
      const send = jest.fn();
      const { service } = setup({ isConfigured: () => false, send });
      const result = await service.send({
        organisationId: "org-1",
        recipientReference: "+264814376206",
        message: "Hi",
      });
      expect(result.outcomeCode).toBe("provider_not_live");
      expect(send).not.toHaveBeenCalled();
    });
  });
});
