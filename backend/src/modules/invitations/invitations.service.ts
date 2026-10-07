import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";

import {
  PersonalDataProtectionService,
  type ProtectedPersonalDataEnvelope,
} from "../../common/data-protection/personal-data-protection.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { organisations, siteHosts, sites, typeDefinition, visitInvitationStatusEvents, visitInvitations } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { SMS_CODES } from "../notifications/sms-template-catalog";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import { TemplatedSmsService } from "../notifications/templated-sms.service";
import { deliverableEmail, formatWhen } from "../notifications/visitor-email";
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
  visitorEmail?: string;
  visitorMobile?: string;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    @Optional() private readonly templatedEmail?: TemplatedEmailService,
    @Optional() private readonly dataProtection?: PersonalDataProtectionService,
    @Optional() private readonly templatedSms?: TemplatedSmsService,
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

    const qrUrl = buildInvitationCheckInUrl(opaqueToken);
    const emailed = await this.sendInvite(created, input, qrUrl, user).catch((error) => {
      this.logger.warn(`Invitation email not sent: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    });
    const texted = await this.sendInviteText(created, input, qrUrl, user).catch((error) => {
      this.logger.warn(`Invitation text not sent: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    });
    return { ...created, qrUrl, opaqueToken, emailed, texted };
  }

  /** Texts the check-in link when the host gave a mobile number. Used once, not stored. Neutral wording; see sms-template-catalog.ts. */
  private async sendInviteText(
    invitation: { expectedFrom: Date | null; expectedUntil: Date | null },
    input: CreateInvitationInput,
    qrUrl: string,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    if (!input.visitorMobile?.trim() || !this.templatedSms) return false;
    const organisation = await this.db.query.organisations.findFirst({ where: eq(organisations.id, user.organisationId) });
    const organisationName = organisation?.tradingName?.trim() || organisation?.legalName || "";
    if (!organisationName) return false;
    const day = invitation.expectedFrom ?? invitation.expectedUntil;
    const visitDate = day
      ? day.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Windhoek" })
      : "your visit";
    const result = await this.templatedSms.send({
      templateCode: SMS_CODES.preRegistrationInvite,
      organisationId: user.organisationId,
      to: input.visitorMobile,
      variables: { organisationName, visitDate, checkInUrl: qrUrl },
    });
    return result.queued;
  }

  /** Emails the check-in link when the host gave an address. The address is used once and is not stored. */
  private async sendInvite(
    invitation: { siteId: string; hostId: string; expectedFrom: Date | null; expectedUntil: Date | null },
    input: CreateInvitationInput,
    qrUrl: string,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    const to = deliverableEmail(input.visitorEmail);
    if (!to || !this.templatedEmail) return false;
    const [site, host] = await Promise.all([
      this.db.query.sites.findFirst({
        where: and(eq(sites.id, invitation.siteId), eq(sites.organisationId, user.organisationId)),
      }),
      this.db.query.siteHosts.findFirst({
        where: and(eq(siteHosts.id, invitation.hostId), eq(siteHosts.organisationId, user.organisationId)),
      }),
    ]);
    const hostName =
      host?.hostNameProtected && this.dataProtection
        ? this.dataProtection.decrypt(host.hostNameProtected as ProtectedPersonalDataEnvelope)
        : "Reception";
    const siteName = site?.name ?? "our site";
    const expectedAt = formatWhen(invitation.expectedFrom);
    const validUntil = formatWhen(invitation.expectedUntil);
    const sent = await this.templatedEmail.send({
      templateCode: "visitor_prereg_invite",
      organisationId: user.organisationId,
      to,
      recipientName: input.visitorReference,
      variables: { siteName, hostName, expectedAt, validUntil, checkInUrl: qrUrl },
      fallback: {
        subject: `You are invited to visit ${siteName}`,
        body: `You have been invited to visit ${siteName}.\n\nHost: ${hostName}\nExpected: ${expectedAt}\nValid until: ${validUntil}\n\nOpen this link on arrival to check in quickly:\n${qrUrl}`,
      },
    });
    return sent !== null;
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
