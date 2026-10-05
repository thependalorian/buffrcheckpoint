import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  organisationAccessReviewLog,
  organisationMemberships,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface RecordReviewInput {
  reviewedUserId: string;
  outcomeCode: string;
  note?: string;
}

/**
 * Periodic access review over an organisation's own memberships — the concrete
 * screen behind admin/'s former "Access Reviews Coming Soon" placeholder.
 *
 * Append-only by construction: an attestation is a point-in-time record, so a
 * revised decision is another row, never an edit. Recording an outcome is
 * deliberately *not* the same action as changing a role — "access revocation
 * required" is an attestation that someone then acts on through
 * RbacService/membership management, so one reviewer can't silently lock a
 * colleague out from a review screen.
 */
@Injectable()
export class AccessReviewsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  /** Every active membership in the org, with its latest attestation (if any). */
  async listMembersForReview(organisationId: string) {
    const memberships = await this.db
      .select({
        membershipId: organisationMemberships.id,
        userId: organisationMemberships.userId,
        roleCodeId: roleDefinitions.roleCode,
        roleCode: typeDefinition.code,
        roleLabel: typeDefinition.label,
        assignedAt: organisationMemberships.assignedAt,
      })
      .from(organisationMemberships)
      .innerJoin(roleDefinitions, eq(organisationMemberships.roleId, roleDefinitions.id))
      .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
      .where(and(eq(organisationMemberships.organisationId, organisationId), isNull(organisationMemberships.deletedAt)))
      .orderBy(desc(organisationMemberships.assignedAt));

    if (memberships.length === 0) return [];

    const [users, reviews] = await Promise.all([
      this.db.query.applicationUsers.findMany({
        where: and(
          inArray(
            applicationUsers.id,
            memberships.map((m) => m.userId),
          ),
          isNull(applicationUsers.deletedAt),
        ),
      }),
      this.db.query.organisationAccessReviewLog.findMany({
        where: eq(organisationAccessReviewLog.organisationId, organisationId),
        orderBy: desc(organisationAccessReviewLog.occurredAt),
      }),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));
    const latestReviewByUser = new Map<string, (typeof reviews)[number]>();
    for (const review of reviews) {
      if (!latestReviewByUser.has(review.reviewedUserId)) latestReviewByUser.set(review.reviewedUserId, review);
    }

    return Promise.all(
      memberships
        .filter((membership) => userById.has(membership.userId))
        .map(async (membership) => {
          const account = userById.get(membership.userId);
          const latest = latestReviewByUser.get(membership.userId);
          return {
            membershipId: membership.membershipId,
            userId: membership.userId,
            email: account?.email ?? membership.userId,
            roleCode: membership.roleCode,
            roleLabel: membership.roleLabel,
            mfaEnabled: account?.mfaEnabled ?? false,
            emailVerified: Boolean(account?.emailVerifiedAt),
            lastLoginAt: account?.lastLoginAt ?? null,
            assignedAt: membership.assignedAt,
            lastReviewOutcome: latest ? ((await this.typeDefs.codeById(latest.outcomeCode)) ?? null) : null,
            lastReviewedAt: latest?.occurredAt ?? null,
          };
        }),
    );
  }

  async listReviewHistory(organisationId: string) {
    const rows = await this.db.query.organisationAccessReviewLog.findMany({
      where: eq(organisationAccessReviewLog.organisationId, organisationId),
      orderBy: desc(organisationAccessReviewLog.occurredAt),
      limit: 100,
    });
    if (rows.length === 0) return [];

    const users = await this.db.query.applicationUsers.findMany({
      where: inArray(
        applicationUsers.id,
        rows.map((r) => r.reviewedUserId),
      ),
    });
    const emailByUser = new Map(users.map((u) => [u.id, u.email]));

    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        reviewedUserId: row.reviewedUserId,
        reviewedUserEmail: emailByUser.get(row.reviewedUserId) ?? row.reviewedUserId,
        reviewedRoleCode: row.reviewedRoleCode ? await this.typeDefs.codeById(row.reviewedRoleCode) : null,
        outcomeCode: (await this.typeDefs.codeById(row.outcomeCode)) ?? "unknown",
        reviewerId: row.reviewerId,
        note: row.note,
        occurredAt: row.occurredAt,
      })),
    );
  }

  async recordReview(input: RecordReviewInput, user: AuthenticatedUser) {
    if (input.reviewedUserId === user.userId) {
      throw new BadRequestException("An access review cannot attest to the reviewer's own membership");
    }

    const membership = await this.db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, input.reviewedUserId),
        eq(organisationMemberships.organisationId, user.organisationId),
        isNull(organisationMemberships.deletedAt),
      ),
    });
    if (!membership) throw new NotFoundException("No active membership for that user in your organisation");

    const role = await this.db.query.roleDefinitions.findFirst({ where: eq(roleDefinitions.id, membership.roleId) });
    const outcomeCode = await this.typeDefs.id("access_review_outcome", input.outcomeCode);

    const [row] = await this.db
      .insert(organisationAccessReviewLog)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        membershipId: membership.id,
        reviewedUserId: input.reviewedUserId,
        reviewedRoleCode: role?.roleCode ?? null,
        outcomeCode,
        reviewerId: user.userId,
        note: input.note,
      })
      .returning();

    return row;
  }

  /** Headline numbers for the review tab: how much of the roster is attested, and how much needs action. */
  async summary(organisationId: string) {
    const members = await this.listMembersForReview(organisationId);
    const reviewed = members.filter((m) => m.lastReviewOutcome !== null);
    const actionRequired = members.filter(
      (m) => m.lastReviewOutcome === "role_change_required" || m.lastReviewOutcome === "access_revocation_required",
    );
    return {
      memberCount: members.length,
      reviewedCount: reviewed.length,
      unreviewedCount: members.length - reviewed.length,
      actionRequiredCount: actionRequired.length,
      lastReviewedAt:
        reviewed
          .map((m) => m.lastReviewedAt)
          .filter((value): value is Date => value instanceof Date)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    };
  }
}
