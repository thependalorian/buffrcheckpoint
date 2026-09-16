import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  membershipScopes,
  organisationMembershipStatusLog,
  organisationMemberships,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface ChangeRoleInput {
  userId: string;
  newRoleCode: string; // type_definition code, domain 'role_code'
  siteId?: string | null;
  reason: string;
}

@Injectable()
export class RbacService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  // Section 9.2 rule 7: "A role change must be a high-risk event requiring
  // approval and audit evidence." This applies here — a role *change* on an
  // existing account (as opposed to AuthService.register's *initial*
  // assignment, which deliberately does not write to this log). The caller
  // (a controller-level @RequirePermission(ROLE_MANAGE) guard) is the
  // "approval" — approvedBy is always the acting Compliance/Audit Officer
  // or System Administrator, never the affected user themselves.
  async changeRole(input: ChangeRoleInput, actingUser: AuthenticatedUser) {
    if (input.userId === actingUser.userId) {
      throw new ForbiddenException("Cannot change your own role — requires a second approver");
    }

    const current = await this.db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, input.userId),
        eq(organisationMemberships.organisationId, actingUser.organisationId),
        isNull(organisationMemberships.deletedAt),
      ),
    });
    if (!current) {
      throw new NotFoundException(
        "No existing role assignment for this user — use registration for initial assignment",
      );
    }

    const newRoleCodeId = await this.typeDefs.id("role_code", input.newRoleCode);
    let targetRole = await this.db.query.roleDefinitions.findFirst({
      where: and(
        eq(roleDefinitions.organisationId, actingUser.organisationId),
        eq(roleDefinitions.roleCode, newRoleCodeId),
        isNull(roleDefinitions.deletedAt),
      ),
    });
    if (!targetRole) {
      const [inserted] = await this.db
        .insert(roleDefinitions)
        .values({
          id: randomUUID(),
          organisationId: actingUser.organisationId,
          roleCode: newRoleCodeId,
          roleLabel: input.newRoleCode,
          isSystemRole: input.newRoleCode === "owner_operator",
        })
        .returning();
      targetRole = inserted;
    }

    const changeEventType = await this.typeDefs.id("role_assignment_event_type", "change");

    // Soft-delete the old membership, create a new one — memberships are
    // themselves point-in-time, per the same soft-delete rule as every
    // other table.
    await this.db
      .update(organisationMemberships)
      .set({ deletedAt: new Date() })
      .where(eq(organisationMemberships.id, current.id));

    const [newMembership] = await this.db
      .insert(organisationMemberships)
      .values({
        id: randomUUID(),
        organisationId: actingUser.organisationId,
        userId: input.userId,
        roleId: targetRole.id,
        assignmentEventTypeCode: changeEventType,
      })
      .returning();

    if (input.siteId) {
      await this.db.insert(membershipScopes).values({
        id: randomUUID(),
        membershipId: newMembership.id,
        scopeType: "site",
        scopeId: input.siteId,
      });
    }

    // THIS is the row that only gets written for a change, never for
    // initial provisioning — the concrete fix for the false-positive audit
    // noise problem described in Section 9.2 rule 7 / Section 9.1a.
    await this.db.insert(organisationMembershipStatusLog).values({
      id: randomUUID(),
      membershipId: newMembership.id,
      eventTypeCode: changeEventType,
      occurredAt: new Date(),
      actorId: actingUser.userId,
      approvedBy: actingUser.userId,
      reason: input.reason,
    });

    return newMembership;
  }

  // Backs the admin app's Users screen — no prior read endpoint existed
  // here, only the write path above.
  async listUsers(user: AuthenticatedUser) {
    const users = await this.db.query.applicationUsers.findMany({
      where: and(eq(applicationUsers.organisationId, user.organisationId), isNull(applicationUsers.deletedAt)),
    });

    return Promise.all(
      users.map(async (u) => {
        const membership = await this.db
          .select({ membershipId: organisationMemberships.id, roleCode: typeDefinition.code })
          .from(organisationMemberships)
          .innerJoin(roleDefinitions, eq(organisationMemberships.roleId, roleDefinitions.id))
          .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
          .where(
            and(
              eq(organisationMemberships.userId, u.id),
              eq(organisationMemberships.organisationId, user.organisationId),
              isNull(organisationMemberships.deletedAt),
            ),
          )
          .limit(1);

        const scope = membership[0]
          ? await this.db.query.membershipScopes.findFirst({
              where: and(
                eq(membershipScopes.membershipId, membership[0].membershipId),
                eq(membershipScopes.scopeType, "site"),
              ),
            })
          : null;

        return {
          id: u.id,
          email: u.email,
          emailVerifiedAt: u.emailVerifiedAt,
          mfaEnabled: u.mfaEnabled,
          roleCode: membership[0]?.roleCode ?? null,
          siteId: scope?.scopeId ?? null,
        };
      }),
    );
  }

  // Backs the admin app's Roles screen — the role catalogue actually in
  // use for this organisation (Section 9.1a's Owner-Operator bundle vs.
  // granular roles), not a hardcoded list.
  async listRoles(user: AuthenticatedUser) {
    return this.db
      .select({
        id: roleDefinitions.id,
        roleCode: typeDefinition.code,
        label: typeDefinition.label,
        isSystemRole: roleDefinitions.isSystemRole,
      })
      .from(roleDefinitions)
      .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
      .where(and(eq(roleDefinitions.organisationId, user.organisationId), isNull(roleDefinitions.deletedAt)));
  }
}
