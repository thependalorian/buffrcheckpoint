import { CapabilityStatusService } from "./capability-status.service";

const orgUser = {
  userId: "user-1",
  organisationId: "org-1",
  siteId: null as string | null,
  roleCode: "org_admin",
  permissions: [] as string[],
  emailVerified: true,
  mfaEnabled: true,
};

function buildService(opts: {
  platformLive?: Partial<Record<string, string>>;
  orgRows?: Array<{ capabilityCode: string; statusCode: string }>;
  capabilityIdByCode?: Record<string, string>;
  statusById?: Record<string, string>;
}) {
  const platformLive = opts.platformLive ?? {};
  const capabilityIdByCode = opts.capabilityIdByCode ?? {
    diginam_verification: "cap-diginam",
    national_eid_nfc: "cap-eid",
    nfc_badge_checkin: "cap-nfc",
    ussd: "cap-ussd",
    qr_invitation_checkin: "cap-qr",
    sms_contact_confirmation: "cap-sms",
  };
  const statusById = opts.statusById ?? {
    "status-approved": "approved",
    "status-suspended": "suspended",
    "status-not-started": "not_started",
  };

  const typeDefs = {
    id: jest.fn(),
    codeById: jest.fn(async (id: string) => statusById[id] ?? null),
  };

  const db = {
    query: {
      platformCapabilityApprovals: {
        findMany: jest.fn().mockResolvedValue(
          Object.entries(platformLive).map(([code, publicStatus]) => ({
            capabilityCode: capabilityIdByCode[code],
            publicDisplayStatus: `pub-${publicStatus}`,
          })),
        ),
      },
      typeDefinition: {
        findFirst: jest.fn(async ({ where }: { where: { id?: string } }) => {
          const id = (where as { id?: string }).id;
          if (!id) return null;
          if (id.startsWith("pub-")) {
            return { id, code: id.replace("pub-", "") };
          }
          const code = Object.entries(capabilityIdByCode).find(([, v]) => v === id)?.[0];
          return code ? { id, code } : null;
        }),
        findMany: jest.fn().mockResolvedValue(
          Object.entries(capabilityIdByCode).map(([code, id]) => ({
            id,
            code,
            domain: "capability_code",
          })),
        ),
      },
      organisationCapabilityEnablement: {
        findMany: jest.fn().mockResolvedValue(opts.orgRows ?? []),
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(),
    insert: jest.fn(),
  };

  // listPublic resolves type defs via findFirst on capability + public status IDs
  db.query.typeDefinition.findFirst = jest.fn(async (args: { where: unknown }) => {
    const eqCall = args.where as { queryChunks?: unknown };
    // drizzle eq objects are opaque; fall back by scanning mock IDs from platform rows
    void eqCall;
    return null;
  });

  const service = new CapabilityStatusService(db as never, typeDefs as never);

  // Stub listPublic for effective tests — avoids drizzle eq matching complexity.
  jest.spyOn(service, "listPublic").mockResolvedValue({
    diginamVerification: (platformLive.diginam_verification as "live") ?? "not_available",
    nationalEidNfc: (platformLive.national_eid_nfc as "live") ?? "not_available",
    nfcBadgeCheckIn: (platformLive.nfc_badge_checkin as "live") ?? "not_available",
    ussd: (platformLive.ussd as "live") ?? "not_available",
    qrInvitationCheckIn: (platformLive.qr_invitation_checkin as "live") ?? "not_available",
    smsContactConfirmation: (platformLive.sms_contact_confirmation as "live") ?? "not_available",
    cimsoInnterchange: (platformLive.cimso_innterchange as "live") ?? "not_available",
  });

  return { service, db, typeDefs };
}

describe("CapabilityStatusService.listPublic defaults", () => {
  it("includes all seven public capability keys with safe defaults", async () => {
    const typeDefs = { id: jest.fn(), codeById: jest.fn() };
    const db = {
      query: {
        platformCapabilityApprovals: { findMany: jest.fn().mockResolvedValue([]) },
        typeDefinition: { findFirst: jest.fn() },
      },
    };

    const service = new CapabilityStatusService(db as never, typeDefs as never);
    const response = await service.listPublic();

    expect(response).toEqual({
      diginamVerification: "not_available",
      nationalEidNfc: "not_available",
      nfcBadgeCheckIn: "not_available",
      ussd: "not_available",
      qrInvitationCheckIn: "not_available",
      smsContactConfirmation: "not_available",
      cimsoInnterchange: "not_available",
    });
  });
});

describe("CapabilityStatusService.listEffectiveForOrganisation", () => {
  it("keeps opt-out defaults live when platform is live and no org row exists", async () => {
    const { service } = buildService({
      platformLive: {
        nfc_badge_checkin: "live",
        qr_invitation_checkin: "live",
        sms_contact_confirmation: "live",
        diginam_verification: "live",
      },
      orgRows: [],
    });

    const effective = await service.listEffectiveForOrganisation(orgUser);

    expect(effective.nfcBadgeCheckIn).toBe("live");
    expect(effective.qrInvitationCheckIn).toBe("live");
    expect(effective.smsContactConfirmation).toBe("not_available");
    expect(effective.diginamVerification).toBe("not_available");
  });

  it("forces suspended org enablement to not_available even when platform is live", async () => {
    const { service } = buildService({
      platformLive: { nfc_badge_checkin: "live", qr_invitation_checkin: "live" },
      orgRows: [{ capabilityCode: "cap-nfc", statusCode: "status-suspended" }],
    });

    const effective = await service.listEffectiveForOrganisation(orgUser);

    expect(effective.nfcBadgeCheckIn).toBe("not_available");
    expect(effective.qrInvitationCheckIn).toBe("live");
  });

  it("keeps approved org enablement live when platform is live", async () => {
    const { service } = buildService({
      platformLive: { sms_contact_confirmation: "live" },
      orgRows: [{ capabilityCode: "cap-sms", statusCode: "status-approved" }],
    });

    const effective = await service.listEffectiveForOrganisation(orgUser);

    expect(effective.smsContactConfirmation).toBe("live");
  });

  it("does not surface national e-ID as live when platform is only targeted even if org enables it", async () => {
    const { service } = buildService({
      platformLive: { national_eid_nfc: "targeted" },
      orgRows: [{ capabilityCode: "cap-eid", statusCode: "status-approved" }],
    });

    const effective = await service.listEffectiveForOrganisation(orgUser);

    // Platform must already be live; org enablement alone cannot promote targeted → live.
    expect(effective.nationalEidNfc).toBe("targeted");
    expect(effective.nationalEidNfc).not.toBe("live");
  });

  it("does not surface DigiNam as live when platform is not_available despite org approved row", async () => {
    const { service } = buildService({
      platformLive: { diginam_verification: "not_available" },
      orgRows: [{ capabilityCode: "cap-diginam", statusCode: "status-approved" }],
    });

    const effective = await service.listEffectiveForOrganisation(orgUser);

    expect(effective.diginamVerification).toBe("not_available");
  });
});
