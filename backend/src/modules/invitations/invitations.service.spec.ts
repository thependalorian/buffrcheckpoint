import { BadRequestException, NotFoundException } from "@nestjs/common";

import { generateOpaqueInvitationToken, invitationTokenHmac } from "./invitation-token.util";
import { InvitationsService } from "./invitations.service";

const orgUser = {
  userId: "user-1",
  organisationId: "org-1",
  siteId: null as string | null,
  roleCode: "org_admin",
  permissions: [] as string[],
  emailVerified: true,
  mfaEnabled: true,
  audience: "admin" as const,
};

describe("InvitationsService", () => {
  const typeDefs = {
    id: jest.fn(async (_domain: string, code: string) => `id-${code}`),
    codeById: jest.fn(async (id: string) => id.replace(/^id-/, "")),
  };

  it("create stores HMAC of opaque token and returns qrUrl with visitor category", async () => {
    const inserted: Record<string, unknown>[] = [];
    const statusEvents: Record<string, unknown>[] = [];
    const db = {
      insert: jest.fn((_table: { [key: string]: unknown }) => ({
        values: (row: Record<string, unknown>) => {
          if ("tokenHmac" in row) {
            inserted.push(row);
            return {
              returning: async () => [{ ...row, id: row.id }],
            };
          }
          statusEvents.push(row);
          return Promise.resolve();
        },
      })),
      query: {},
    };

    const service = new InvitationsService(db as never, typeDefs as never);
    const result = await service.create(
      {
        siteId: "site-1",
        hostId: "host-1",
        visitorReference: "visitor-ref",
        visitorCategoryCode: "contractor",
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
      orgUser,
    );

    expect(result.opaqueToken).toBeTruthy();
    expect(result.qrUrl).toContain(result.opaqueToken);
    expect(inserted[0]?.tokenHmac).toBe(invitationTokenHmac(result.opaqueToken));
    expect(inserted[0]?.visitorCategoryCode).toBe("id-contractor");
    expect(statusEvents).toHaveLength(1);
    expect(typeDefs.id).toHaveBeenCalledWith("visitor_type", "contractor");
  });

  it("resolvePublicToken rejects revoked invitations", async () => {
    const token = generateOpaqueInvitationToken();
    const hmac = invitationTokenHmac(token);
    const db = {
      query: {
        visitInvitations: {
          findFirst: jest.fn().mockResolvedValue({
            id: "inv-1",
            tokenHmac: hmac,
            deletedAt: null,
            revokedAt: new Date(),
            validFrom: new Date(Date.now() - 1000),
            expectedUntil: new Date(Date.now() + 86_400_000),
            redeemedCount: 0,
            maximumRedemptions: 1,
            siteId: "site-1",
            hostId: "host-1",
            visitorCategoryCode: "id-general",
          }),
        },
      },
    };

    const service = new InvitationsService(db as never, typeDefs as never);
    await expect(service.resolvePublicToken(token)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resolvePublicToken rejects expired invitations", async () => {
    const token = generateOpaqueInvitationToken();
    const db = {
      query: {
        visitInvitations: {
          findFirst: jest.fn().mockResolvedValue({
            id: "inv-1",
            tokenHmac: invitationTokenHmac(token),
            deletedAt: null,
            revokedAt: null,
            validFrom: new Date(Date.now() - 86_400_000),
            expectedUntil: new Date(Date.now() - 1000),
            redeemedCount: 0,
            maximumRedemptions: 1,
            siteId: "site-1",
            hostId: "host-1",
            visitorCategoryCode: "id-general",
          }),
        },
      },
    };

    const service = new InvitationsService(db as never, typeDefs as never);
    await expect(service.resolvePublicToken(token)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("resolvePublicToken returns site payload when token matches", async () => {
    const token = generateOpaqueInvitationToken();
    const db = {
      query: {
        visitInvitations: {
          findFirst: jest.fn().mockResolvedValue({
            id: "inv-1",
            tokenHmac: invitationTokenHmac(token),
            deletedAt: null,
            revokedAt: null,
            validFrom: new Date(Date.now() - 1000),
            expectedUntil: new Date(Date.now() + 86_400_000),
            redeemedCount: 0,
            maximumRedemptions: 1,
            siteId: "site-1",
            hostId: "host-1",
            visitorCategoryCode: "id-contractor",
          }),
        },
        sites: {
          findFirst: jest.fn().mockResolvedValue({ id: "site-1", name: "Gate A" }),
        },
      },
    };

    const service = new InvitationsService(db as never, typeDefs as never);
    await expect(service.resolvePublicToken(token)).resolves.toEqual({
      invitationId: "inv-1",
      siteId: "site-1",
      siteName: "Gate A",
      hostId: "host-1",
      visitorCategoryCode: "contractor",
    });
  });

  it("resolvePublicToken throws NotFound when HMAC misses", async () => {
    const db = {
      query: {
        visitInvitations: {
          findFirst: jest.fn().mockResolvedValue(undefined),
        },
      },
    };
    const service = new InvitationsService(db as never, typeDefs as never);
    await expect(service.resolvePublicToken("no-such-token")).rejects.toBeInstanceOf(NotFoundException);
  });

  describe("invitation email", () => {
    const makeDb = () => ({
      insert: jest.fn(() => ({
        values: (row: Record<string, unknown>) =>
          "tokenHmac" in row ? { returning: async () => [{ ...row }] } : Promise.resolve(),
      })),
      query: {
        sites: { findFirst: jest.fn(async () => ({ name: "Main reception" })) },
        siteHosts: { findFirst: jest.fn(async () => ({ hostNameProtected: null })) },
      },
    });
    const base = {
      siteId: "site-1",
      hostId: "host-1",
      visitorReference: "Maria",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    };

    it("emails the check-in link when the host gives an address, and does not store the address", async () => {
      const send = jest.fn(async () => ({ id: "n1" }));
      const db = makeDb();
      const service = new InvitationsService(db as never, typeDefs as never, { send } as never);
      const result = await service.create({ ...base, visitorEmail: "Maria@Example.com" }, orgUser);

      expect(result.emailed).toBe(true);
      const call = send.mock.calls[0] as unknown as [
        { templateCode: string; to: string; variables: Record<string, string>; recipientName: string },
      ];
      expect(call[0].templateCode).toBe("visitor_prereg_invite");
      expect(call[0].to).toBe("maria@example.com");
      expect(call[0].variables.checkInUrl).toBe(result.qrUrl);
      expect(call[0].recipientName).toBe("Maria");
      const rows = (db.insert.mock.results as Array<{ value: unknown }>).length;
      expect(rows).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain("maria@example.com");
    });

    it("sends nothing without an address, or with one that is not a single plain address", async () => {
      const send = jest.fn(async () => ({ id: "n1" }));
      const service = new InvitationsService(makeDb() as never, typeDefs as never, { send } as never);
      expect((await service.create(base, orgUser)).emailed).toBe(false);
      expect((await service.create({ ...base, visitorEmail: "a@b.com, c@d.com" }, orgUser)).emailed).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });

    it("still creates the invitation when the email cannot be queued", async () => {
      const send = jest.fn(async () => {
        throw new Error("outbox down");
      });
      const service = new InvitationsService(makeDb() as never, typeDefs as never, { send } as never);
      const result = await service.create({ ...base, visitorEmail: "maria@example.com" }, orgUser);
      expect(result.opaqueToken).toBeTruthy();
      expect(result.emailed).toBe(false);
    });
  });
});
