import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { sites, typeDefinition, visitInvitationStatusEvents, visitInvitations } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { buildInvitationCheckInUrl, generateOpaqueInvitationToken, invitationTokenHmac } from "./invitation-token.util";
import { randomBytes, randomUUID } from "node:crypto";

export interface CreateInvitationInput {
  siteId: string;
  hostId: string;
  visitorReference: string;
  visitorCategoryCode?: string;
  expectedAt?: string;
  expiresAt: string;
  validFrom?: string;
  maximumRedemptions?: number;
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async create(input: CreateInvitationInput, user: AuthenticatedUser) {
    const pendingStatus = await this.typeDefs.id("invitation_status", "pending");
    const visitorCategoryCode = await this.typeDefs.id("visitor_type", input.visitorCategoryCode ?? "general");
    const opaqueToken = generateOpaqueInvitationToken();
    const tokenHmac = invitationTokenHmac(opaqueToken);
    const now = new Date();

    const [created] = await this.db
      .insert(visitInvitations)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: input.siteId,
        hostId: input.hostId,
        visitorCategoryCode,
        visitorReference: input.visitorReference,
        invitationCode: randomBytes(6).toString("hex"),
        tokenHmac,
        issuedAt: now,
        validFrom: input.validFrom ? new Date(input.validFrom) : now,
        maximumRedemptions: input.maximumRedemptions ?? 1,
        redeemedCount: 0,
        expectedFrom: input.expectedAt ? new Date(input.expectedAt) : null,
        expectedUntil: new Date(input.expiresAt),
        statusCode: pendingStatus,
      })
      .returning();

    await this.db.insert(visitInvitationStatusEvents).values({
      id: randomUUID(),
      invitationId: created.id,
      statusCode: pendingStatus,
      occurredAt: now,
      actorId: user.userId,
      reason: "created",
    });

    return {
      ...created,
      qrUrl: buildInvitationCheckInUrl(opaqueToken),
      opaqueToken,
    };
  }

  async revoke(invitationId: string, reason: string, user: AuthenticatedUser) {
    const found = await this.getById(invitationId, user);
    const revokedStatus = await this.typeDefs.id("invitation_status", "cancelled");
    const now = new Date();

    await this.db
      .update(visitInvitations)
      .set({ revokedAt: now, statusCode: revokedStatus })
      .where(eq(visitInvitations.id, found.id));

    await this.db.insert(visitInvitationStatusEvents).values({
      id: randomUUID(),
      invitationId: found.id,
      statusCode: revokedStatus,
      occurredAt: now,
      actorId: user.userId,
      reason,
    });

    return { invitationId: found.id, revoked: true };
  }

  async resolvePublicToken(token: string) {
    const hmac = invitationTokenHmac(token.trim());
    const invitation = await this.db.query.visitInvitations.findFirst({
      where: and(eq(visitInvitations.tokenHmac, hmac), isNull(visitInvitations.deletedAt)),
    });
    if (!invitation) {
      throw new NotFoundException("Invitation not found or no longer valid");
    }
    if (invitation.revokedAt) {
      throw new BadRequestException("Invitation has been revoked");
    }
    const now = Date.now();
    if (invitation.validFrom && invitation.validFrom.getTime() > now) {
      throw new BadRequestException("Invitation is not yet valid");
    }
    if (invitation.expectedUntil && invitation.expectedUntil.getTime() < now) {
      throw new BadRequestException("Invitation has expired");
    }
    if (invitation.redeemedCount >= invitation.maximumRedemptions) {
      throw new BadRequestException("Invitation has already been used");
    }

    const site = await this.db.query.sites.findFirst({ where: eq(sites.id, invitation.siteId) });
    const visitorCategoryCode = invitation.visitorCategoryCode
      ? ((await this.typeDefs.codeById(invitation.visitorCategoryCode)) ?? "general")
      : "general";
    return {
      invitationId: invitation.id,
      siteId: invitation.siteId,
      siteName: site?.name ?? "Site",
      hostId: invitation.hostId,
      visitorCategoryCode,
    };
  }

  async matchAtCheckIn(invitationId: string, user: AuthenticatedUser) {
    const invitation = await this.getById(invitationId, user);
    if (invitation.revokedAt) throw new BadRequestException("Invitation revoked");
    if (invitation.expectedUntil && invitation.expectedUntil.getTime() < Date.now()) {
      throw new BadRequestException("Invitation expired");
    }
    if (invitation.redeemedCount >= invitation.maximumRedemptions) {
      throw new BadRequestException("Invitation already redeemed");
    }

    const matchedStatus = await this.typeDefs.id("invitation_status", "matched");
    await this.db
      .update(visitInvitations)
      .set({
        redeemedCount: invitation.redeemedCount + 1,
        statusCode: matchedStatus,
      })
      .where(eq(visitInvitations.id, invitation.id));

    await this.db.insert(visitInvitationStatusEvents).values({
      id: randomUUID(),
      invitationId: invitation.id,
      statusCode: matchedStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason: "matched_at_checkin",
    });

    return { matched: true };
  }

  async listUpcoming(user: AuthenticatedUser, siteId?: string, from?: string, to?: string) {
    const conditions = [eq(visitInvitations.organisationId, user.organisationId), isNull(visitInvitations.deletedAt)];
    if (siteId) conditions.push(eq(visitInvitations.siteId, siteId));
    if (from) conditions.push(gte(visitInvitations.expectedFrom, new Date(from)));
    if (to) conditions.push(lte(visitInvitations.expectedFrom, new Date(to)));

    const invitations = await this.db.query.visitInvitations.findMany({ where: and(...conditions) });

    const statusIds = [...new Set(invitations.map((i) => i.statusCode))];
    const statusRows = statusIds.length
      ? await this.db.query.typeDefinition.findMany({ where: inArray(typeDefinition.id, statusIds) })
      : [];
    const statusById = new Map(statusRows.map((row) => [row.id, row.code]));

    return invitations.map((invitation) => ({
      ...invitation,
      statusCode: statusById.get(invitation.statusCode) ?? "unknown",
    }));
  }

  async getById(invitationId: string, user: AuthenticatedUser) {
    const found = await this.db.query.visitInvitations.findFirst({
      where: and(
        eq(visitInvitations.id, invitationId),
        eq(visitInvitations.organisationId, user.organisationId),
        isNull(visitInvitations.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Invitation not found");
    return found;
  }
}
