import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  membershipScopes,
  organisationMembershipStatusLog,
  organisationMemberships,
  passwordResetTokens,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PlatformNotificationTemplateService } from "../platform-configuration/platform-notification-template.service";

const PLATFORM_ROLE_CODE = "platform_support";
const INVITATION_TTL_MS = 60 * 60 * 1000;

/**
 * Roles a platform staff account may hold. Deliberately short: this screen
 * exists to run Buffr's own internal staff list, not to hand out customer
 * roles inside the platform's home organisation.
 */
const ASSIGNABLE_ROLE_CODES = [PLATFORM_ROLE_CODE, "compliance_audit_officer"] as const;

export interface InviteStaffInput {
  email: string;
  roleCode?: string;
}

/**
 * Platform staff administration (migration 0029's platform.staff.manage).
 * Everything is scoped to the acting staff member's own home organisation —
 * the Buffr tenant that platform_support memberships live in (see migration
 * 0027) — never to a customer org, and never via a client-supplied
 * organisationId.
 *
 * There is no separate user-invitation table: an invite is an
 * application_users row with no password_hash plus a single-use
 * password_reset_tokens row, which is exactly what AuthService's reset flow
 * already consumes. One writer per table family — this service writes staff
 * memberships in the platform org, AuthService/RbacService keep their own
 * paths untouched.
 */
@Injectable()
export class PlatformStaffService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly notifications: NotificationsService,
    private readonly templates: PlatformNotificationTemplateService,
  ) {}

  async list(user: AuthenticatedUser) {
    const memberships = await this.db
      .select({
        membershipId: organisationMemberships.id,
        userId: organisationMemberships.userId,
        roleCode: typeDefinition.code,
        assignedAt: organisationMemberships.assignedAt,
      })
      .from(organisationMemberships)
      .innerJoin(roleDefinitions, eq(organisationMemberships.roleId, roleDefinitions.id))
      .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
      .where(
        and(
          eq(organisationMemberships.organisationId, user.organisationId),
          isNull(organisationMemberships.deletedAt),
          inArray(typeDefinition.code, [...ASSIGNABLE_ROLE_CODES]),
        ),
      )
      .orderBy(desc(organisationMemberships.assignedAt));

    if (memberships.length === 0) return [];

    const users = await this.db.query.applicationUsers.findMany({
      where: inArray(
        applicationUsers.id,
        memberships.map((m) => m.userId),
      ),
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return memberships
      .map((membership) => {
        const account = userById.get(membership.userId);
        if (!account) return null;
        return {
          userId: account.id,
          membershipId: membership.membershipId,
          email: account.email,
          roleCode: membership.roleCode,
          mfaEnabled: account.mfaEnabled,
          emailVerified: Boolean(account.emailVerifiedAt),
          passwordSet: Boolean(account.passwordHash),
          lastLoginAt: account.lastLoginAt,
          lockedUntil: account.lockedUntil,
          deactivatedAt: account.deletedAt,
          assignedAt: membership.assignedAt,
          isSelf: account.id === user.userId,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }

  async invite(input: InviteStaffInput, user: AuthenticatedUser) {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) throw new BadRequestException("A valid email address is required");
    const roleCode = this.assertAssignableRole(input.roleCode ?? PLATFORM_ROLE_CODE);

    const existing = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.organisationId, user.organisationId), eq(applicationUsers.email, email)),
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException("An account with that email already exists in this organisation");
    }

    // A previously deactivated account is reinstated rather than duplicated —
    // the unique index is (organisation_id, email), and soft deletes mean the
    // row is still there.
    const userId = existing?.id ?? randomUUID();
    if (existing) {
      await this.db
        .update(applicationUsers)
        .set({ deletedAt: null, failedLoginCount: 0, lockedUntil: null, passwordHash: null })
        .where(eq(applicationUsers.id, existing.id));
    } else {
      await this.db.insert(applicationUsers).values({
        id: userId,
        organisationId: user.organisationId,
        email,
        passwordHash: null,
      });
    }

    await this.assignRole(userId, user.organisationId, roleCode, user, existing ? "reinstated" : "initial invitation");
    const resetUrl = await this.issueInvitationLink(userId, email, user.organisationId);

    return { userId, email, roleCode, invitationLinkIssued: Boolean(resetUrl) };
  }

  /** Re-issues the set-password link for a staff account that never activated (or lost the mail). */
  async resendInvitation(userId: string, user: AuthenticatedUser) {
    const account = await this.requireStaffAccount(userId, user.organisationId);
    const resetUrl = await this.issueInvitationLink(account.id, account.email, user.organisationId);
    return { userId: account.id, invitationLinkIssued: Boolean(resetUrl) };
  }

  async setRole(userId: string, roleCode: string, user: AuthenticatedUser, reason?: string) {
    if (userId === user.userId) {
      throw new BadRequestException("Cannot change your own platform role — requires a second administrator");
    }
    const account = await this.requireStaffAccount(userId, user.organisationId);
    const nextRoleCode = this.assertAssignableRole(roleCode);
    await this.assignRole(account.id, user.organisationId, nextRoleCode, user, reason ?? "platform role change");
    return { userId: account.id, roleCode: nextRoleCode };
  }

  /** Soft delete only (Wiebe rule 7) — the account keeps its audit trail and can be reinstated by re-inviting. */
  async deactivate(userId: string, user: AuthenticatedUser, reason?: string) {
    if (userId === user.userId) {
      throw new BadRequestException("Cannot deactivate your own account");
    }
    const account = await this.requireStaffAccount(userId, user.organisationId);
    const now = new Date();

    await this.db.update(applicationUsers).set({ deletedAt: now }).where(eq(applicationUsers.id, account.id));

    const memberships = await this.db.query.organisationMemberships.findMany({
      where: and(
        eq(organisationMemberships.userId, account.id),
        eq(organisationMemberships.organisationId, user.organisationId),
        isNull(organisationMemberships.deletedAt),
      ),
    });
    const changeEventType = await this.typeDefs.id("role_assignment_event_type", "change");
    for (const membership of memberships) {
      await this.db
        .update(organisationMemberships)
        .set({ deletedAt: now })
        .where(eq(organisationMemberships.id, membership.id));
      await this.db.insert(organisationMembershipStatusLog).values({
        id: randomUUID(),
        membershipId: membership.id,
        eventTypeCode: changeEventType,
        occurredAt: now,
        actorId: user.userId,
        approvedBy: user.userId,
        reason: reason ?? "platform staff deactivated",
      });
    }

    // Any outstanding set-password link dies with the account.
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, account.id));

    return { userId: account.id, deactivatedAt: now };
  }

  private assertAssignableRole(roleCode: string): (typeof ASSIGNABLE_ROLE_CODES)[number] {
    const match = ASSIGNABLE_ROLE_CODES.find((code) => code === roleCode);
    if (!match) {
      throw new BadRequestException(`roleCode must be one of: ${ASSIGNABLE_ROLE_CODES.join(", ")}`);
    }
    return match;
  }

  private async requireStaffAccount(userId: string, organisationId: string) {
    const account = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.id, userId), eq(applicationUsers.organisationId, organisationId)),
    });
    if (!account) throw new NotFoundException("Staff account not found in this organisation");
    return account;
  }

  /**
   * Soft-deletes any current membership and writes a fresh one, same shape as
   * RbacService.changeRole — memberships are point-in-time rows, and the
   * status-log entry is only written for a change, never initial provisioning.
   */
  private async assignRole(
    userId: string,
    organisationId: string,
    roleCode: string,
    actor: AuthenticatedUser,
    reason: string,
  ) {
    const roleCodeId = await this.typeDefs.id("role_code", roleCode);
    let role = await this.db.query.roleDefinitions.findFirst({
      where: and(
        eq(roleDefinitions.organisationId, organisationId),
        eq(roleDefinitions.roleCode, roleCodeId),
        isNull(roleDefinitions.deletedAt),
      ),
    });
    if (!role) {
      const [inserted] = await this.db
        .insert(roleDefinitions)
        .values({
          id: randomUUID(),
          organisationId,
          roleCode: roleCodeId,
          roleLabel: roleCode === PLATFORM_ROLE_CODE ? "Platform Support" : roleCode,
          isSystemRole: true,
          requiresMfa: true,
          requiresVerifiedEmail: true,
        })
        .returning();
      role = inserted;
    }

    const current = await this.db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId),
        isNull(organisationMemberships.deletedAt),
      ),
    });

    const eventCode = current ? "change" : "initial";
    const eventTypeCode = await this.typeDefs.id("role_assignment_event_type", eventCode);

    if (current) {
      if (current.roleId === role.id) return current;
      await this.db
        .update(organisationMemberships)
        .set({ deletedAt: new Date() })
        .where(eq(organisationMemberships.id, current.id));
    }

    const [membership] = await this.db
      .insert(organisationMemberships)
      .values({
        id: randomUUID(),
        organisationId,
        userId,
        roleId: role.id,
        assignmentEventTypeCode: eventTypeCode,
      })
      .returning();

    await this.db.insert(membershipScopes).values({
      id: randomUUID(),
      membershipId: membership.id,
      scopeType: "organisation",
      scopeId: organisationId,
    });

    if (eventCode === "change") {
      await this.db.insert(organisationMembershipStatusLog).values({
        id: randomUUID(),
        membershipId: membership.id,
        eventTypeCode,
        occurredAt: new Date(),
        actorId: actor.userId,
        approvedBy: actor.userId,
        reason,
      });
    }

    return membership;
  }

  /**
   * Single-use set-password link. The landing page is admin/'s
   * /auth/reset-password — the ops console has no password-reset screen of its
   * own, and duplicating one for a handful of internal accounts would be a
   * second implementation of the same flow.
   */
  private async issueInvitationLink(userId: string, email: string, organisationId: string): Promise<string | null> {
    const rawToken = randomBytes(32).toString("hex");
    await this.db.insert(passwordResetTokens).values({
      id: randomUUID(),
      userId,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${adminBase}/auth/reset-password?token=${rawToken}`;

    const rendered = await this.templates.render(
      "platform_staff_invitation",
      { resetUrl },
      {
        subject: "You have been invited to Buffr Checkpoint Platform Ops",
        body: [
          "A Buffr Checkpoint platform administrator invited you to the internal Platform Ops console.",
          "Set your password to activate the account: {{resetUrl}}",
          "This link expires in one hour. Request a new one from the sign-in page if it lapses.",
        ].join("\n\n"),
      },
    );

    await this.notifications
      .sendForOrganisation({
        organisationId,
        channelCode: "email",
        recipientReference: email,
        subject: rendered.subject,
        message: rendered.body,
      })
      .catch(() => undefined);

    return resetUrl;
  }
}
