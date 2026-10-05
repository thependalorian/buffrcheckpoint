import { FIXTURE_RESERVATION } from "./__fixtures__/synthetic-messages";
import { getCimsoConfig } from "./cimso.config";
import { CIMSO_HOSPITALITY_DEFAULT_TYPES } from "./cimso.types";
import { CimsoIntegrationService } from "./cimso-integration.service";
import { reservationToInvitationDraft } from "./mappers/reservation-to-invitation";
import { visitToFrontDeskEvent } from "./mappers/visit-to-front-desk-event";

describe("cimso mappers (AFTER_NDA stubs)", () => {
  it("maps reservation fixture to invitation draft without inventing PII fields", () => {
    const draft = reservationToInvitationDraft(FIXTURE_RESERVATION);
    expect(draft.externalReservationId).toBe("AFTER_NDA_RES_001");
    expect(draft.guestDisplayName).toBe("Demo Guest");
    expect(draft.roomCode).toBe("R12");
    expect(Object.keys(draft)).not.toContain("passportNumber");
    expect(Object.keys(draft)).not.toContain("idNumber");
  });

  it("maps visit check-in to a checkpoint-scoped front-desk event id", () => {
    const event = visitToFrontDeskEvent({
      visitId: "11111111-1111-4111-8111-111111111111",
      eventType: "check_in",
      externalReservationId: "AFTER_NDA_RES_001",
      occurredAt: "2026-10-01T14:00:00.000Z",
    });
    expect(event.externalEventId).toContain("bc_");
    expect(event.eventType).toBe("check_in");
    expect(event.checkpointVisitId).toBe("11111111-1111-4111-8111-111111111111");
  });
});

describe("cimso config defaults", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("defaults hospitality interface types to 1, 3, and 4", () => {
    delete process.env.CIMSO_ENABLED_INTERFACE_TYPES;
    delete process.env.CIMSO_INNTERCHANGE_BASE_URL;
    delete process.env.CIMSO_INNTERCHANGE_API_KEY;
    delete process.env.CIMSO_INNTERCHANGE_HOST;
    delete process.env.CIMSO_INNTERCHANGE_PORT;
    delete process.env.CIMSO_INNTERCHANGE_CLIENT_LOGIN_ID;
    delete process.env.CIMSO_INNTERCHANGE_CLIENT_PASSWORD;
    const cfg = getCimsoConfig();
    expect(cfg.enabledInterfaceTypes).toEqual([1, 3, 4]);
    expect(CIMSO_HOSPITALITY_DEFAULT_TYPES).toEqual([1, 3, 4]);
    expect(cfg.transportConfigured).toBe(false);
    expect(cfg.apiKeyPresent).toBe(false);
  });
});

describe("resolveConnectionTransport", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  function service(): CimsoIntegrationService {
    return Object.create(CimsoIntegrationService.prototype) as CimsoIntegrationService;
  }

  it("resolves password from credentials_secret_ref env key", () => {
    process.env.CIMSO_SITE_DEMO_CLIENT_PASSWORD = "secret-from-ref";
    delete process.env.CIMSO_INNTERCHANGE_CLIENT_PASSWORD;
    const transport = service().resolveConnectionTransport({
      tcpHost: "10.0.0.1",
      tcpPort: 9443,
      tlsEnabled: true,
      clientLoginId: "buffr",
      credentialsSecretRef: "CIMSO_SITE_DEMO_CLIENT_PASSWORD",
    });
    expect(transport.transportConfigured).toBe(true);
    expect(transport.password).toBe("secret-from-ref");
  });

  it("falls back to global CIMSO_INNTERCHANGE_CLIENT_PASSWORD", () => {
    delete process.env.CIMSO_SITE_DEMO_CLIENT_PASSWORD;
    process.env.CIMSO_INNTERCHANGE_CLIENT_PASSWORD = "global-secret";
    const transport = service().resolveConnectionTransport({
      tcpHost: "10.0.0.1",
      tcpPort: 9443,
      tlsEnabled: true,
      clientLoginId: "buffr",
      credentialsSecretRef: "CIMSO_SITE_DEMO_CLIENT_PASSWORD",
    });
    expect(transport.transportConfigured).toBe(true);
    expect(transport.password).toBe("global-secret");
  });

  it("is not configured without password", () => {
    delete process.env.CIMSO_SITE_DEMO_CLIENT_PASSWORD;
    delete process.env.CIMSO_INNTERCHANGE_CLIENT_PASSWORD;
    const transport = service().resolveConnectionTransport({
      tcpHost: "10.0.0.1",
      tcpPort: 9443,
      tlsEnabled: true,
      clientLoginId: "buffr",
      credentialsSecretRef: "CIMSO_SITE_DEMO_CLIENT_PASSWORD",
    });
    expect(transport.transportConfigured).toBe(false);
  });
});

describe("persistReservationDrafts (fixture)", () => {
  it("creates invitation + entity link for a new reservation draft", async () => {
    const draft = reservationToInvitationDraft(FIXTURE_RESERVATION);
    const createdInvitation = { id: "inv-1" };
    const invitations = {
      create: jest.fn().mockResolvedValue(createdInvitation),
    };
    const typeDefs = {
      id: jest.fn().mockResolvedValue("kind-reservation"),
    };
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const db = {
      query: {
        pmsExternalEntityLinks: {
          findFirst: jest.fn().mockResolvedValue(undefined),
        },
      },
      insert: jest.fn().mockReturnValue({ values: insertValues }),
    };

    const svc = Object.create(CimsoIntegrationService.prototype) as CimsoIntegrationService;
    Object.assign(svc, { db, typeDefs, invitations });

    const result = await svc.persistReservationDrafts({
      drafts: [draft],
      connectionId: "conn-1",
      siteId: "site-1",
      defaultHostId: "host-1",
      user: {
        userId: "user-1",
        organisationId: "org-1",
        siteId: "site-1",
        roleCode: "owner_operator",
        permissions: [],
        emailVerified: true,
        mfaEnabled: true,
        audience: "admin",
      },
    });

    expect(result.applied).toBe(1);
    expect(result.skippedExisting).toBe(0);
    expect(invitations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        hostId: "host-1",
        visitorReference: "Demo Guest",
      }),
      expect.any(Object),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        externalEntityId: "AFTER_NDA_RES_001",
        invitationId: "inv-1",
        connectionId: "conn-1",
      }),
    );
  });

  it("skips drafts that already have an entity link", async () => {
    const draft = reservationToInvitationDraft(FIXTURE_RESERVATION);
    const invitations = { create: jest.fn() };
    const typeDefs = { id: jest.fn().mockResolvedValue("kind-reservation") };
    const db = {
      query: {
        pmsExternalEntityLinks: {
          findFirst: jest.fn().mockResolvedValue({ id: "link-1" }),
        },
      },
      insert: jest.fn(),
    };
    const svc = Object.create(CimsoIntegrationService.prototype) as CimsoIntegrationService;
    Object.assign(svc, { db, typeDefs, invitations });

    const result = await svc.persistReservationDrafts({
      drafts: [draft],
      connectionId: "conn-1",
      siteId: "site-1",
      defaultHostId: "host-1",
      user: {
        userId: "user-1",
        organisationId: "org-1",
        siteId: "site-1",
        roleCode: "owner_operator",
        permissions: [],
        emailVerified: true,
        mfaEnabled: true,
        audience: "admin",
      },
    });

    expect(result.applied).toBe(0);
    expect(result.skippedExisting).toBe(1);
    expect(invitations.create).not.toHaveBeenCalled();
  });
});
