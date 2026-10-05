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
      insert: jest.fn((table: { [key: string]: unknown }) => ({
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
});
