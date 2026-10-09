import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";

import { ScopedPermissionEvaluationService } from "../../common/access-control/scoped-permission-evaluation.service";
import { markCredentialsChanged } from "../../common/auth/credential-revocation";
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
  newRoleCode: string;
  siteId?: string | null;
  reason: string;
}

/** Customer-assignable roles (Section 9.1) — not visitor, platform_support, or DigiNam adapter. */
export const CUSTOMER_ASSIGNABLE_ROLE_CODES = [
  "owner_operator",
  "host_staff",
  "front_desk_operator",
  "site_manager",
  "regional_manager",
  "compliance_audit_officer",
  "system_administrator",
] as const;

export type CustomerAssignableRoleCode = (typeof CUSTOMER_ASSIGNABLE_ROLE_CODES)[number];

const CORE_ROLE_CODES = new Set(["owner_operator", "front_desk_operator", "host_staff"]);

@Injectable()
export class RbacService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly permissionEvaluation: ScopedPermissionEvaluationService,
  ) {}

  assertAssignableRoleCode(roleCode: string): asserts roleCode is CustomerAssignableRoleCode {
    if (!(CUSTOMER_ASSIGNABLE_ROLE_CODES as readonly string[]).includes(roleCode)) {
      throw new BadRequestException(
        `Role '${roleCode}' is not assignable by organisation admins. Use one of: ${CUSTOMER_ASSIGNABLE_ROLE_CODES.join(", ")}`,
      );
    }
  }

  /** Ensures the org has a role_definitions row for every customer-assignable role code. */
  async ensureCustomerRoleDefinitions(organisationId: string) {
    const existing = await this.db
      .select({
        id: roleDefinitions.id,
        roleCode: typeDefinition.code,
      })
      .from(roleDefinitions)
      .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
      .where(and(eq(roleDefinitions.organisationId, organisationId), isNull(roleDefinitions.deletedAt)));

    const have = new Set(existing.map((r) => r.roleCode));
    for (const code of CUSTOMER_ASSIGNABLE_ROLE_CODES) {
      if (have.has(code)) continue;
      const roleCodeId = await this.typeDefs.id("role_code", code);
      const labelRow = await this.db.query.typeDefinition.findFirst({
        where: and(eq(typeDefinition.id, roleCodeId), isNull(typeDefinition.deletedAt)),
      });
      await this.db.insert(roleDefinitions).values({
        id: randomUUID(),
        organisationId,
        roleCode: roleCodeId,
        roleLabel: labelRow?.label ?? code,
        isSystemRole: code === "owner_operator",
      });
    }
  }

  async resolveRoleDefinition(organisationId: string, roleCode: string) {
    this.assertAssignableRoleCode(roleCode);
    await this.ensureCustomerRoleDefinitions(organisationId);
    const roleCodeId = await this.typeDefs.id("role_code", roleCode);
    const row = await this.db.query.roleDefinitions.findFirst({
      where: and(
        eq(roleDefinitions.organisationId, organisationId),
        eq(roleDefinitions.roleCode, roleCodeId),
        isNull(roleDefinitions.deletedAt),
      ),
    });
    if (!row) {
      throw new NotFoundException(`Role definition missing for '${roleCode}'`);
    }
    return row;
  }

  // Section 9.2 rule 7: role *change* on an existing account — audited; not initial assignment.
  async changeRole(input: ChangeRoleInput, actingUser: AuthenticatedUser) {
    if (input.userId === actingUser.userId) {
      throw new ForbiddenException("Cannot change your own role — requires a second approver");
    }

    this.assertAssignableRoleCode(input.newRoleCode);

    const current = await this.db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, input.userId),
        eq(organisationMemberships.organisationId, actingUser.organisationId),
        isNull(organisationMemberships.deletedAt),
      ),
    });
    if (!current) {
      throw new NotFoundException("No existing role assignment for this user — invite them first with an initial role");
    }

    const targetRole = await this.resolveRoleDefinition(actingUser.organisationId, input.newRoleCode);
    const changeEventType = await this.typeDefs.id("role_assignment_event_type", "change");

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

    await this.db.insert(organisationMembershipStatusLog).values({
      id: randomUUID(),
      membershipId: newMembership.id,
      eventTypeCode: changeEventType,
      occurredAt: new Date(),
      actorId: actingUser.userId,
      approvedBy: actingUser.userId,
      reason: input.reason,
    });
    // A changed role must take effect at once: tokens carry the old permissions, so every older token is refused (SE-4).
    await markCredentialsChanged(this.db, input.userId);

    return this.getUserDetail(actingUser.organisationId, input.userId);
  }

  async listUsers(user: AuthenticatedUser) {
    await this.ensureCustomerRoleDefinitions(user.organisationId);
    const users = await this.db.query.applicationUsers.findMany({
      where: and(eq(applicationUsers.organisationId, user.organisationId), isNull(applicationUsers.deletedAt)),
    });

    return Promise.all(users.map((u) => this.getUserDetail(user.organisationId, u.id)));
  }

  async getUserDetail(organisationId: string, userId: string) {
    const u = await this.db.query.applicationUsers.findFirst({
      where: and(
        eq(applicationUsers.id, userId),
        eq(applicationUsers.organisationId, organisationId),
        isNull(applicationUsers.deletedAt),
      ),
    });
    if (!u) throw new NotFoundException("User not found");

    const membership = await this.db
      .select({
        membershipId: organisationMemberships.id,
        roleCode: typeDefinition.code,
        roleLabel: typeDefinition.label,
      })
      .from(organisationMemberships)
      .innerJoin(roleDefinitions, eq(organisationMemberships.roleId, roleDefinitions.id))
      .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
      .where(
        and(
          eq(organisationMemberships.userId, u.id),
          eq(organisationMemberships.organisationId, organisationId),
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
      lastLoginAt: u.lastLoginAt,
      roleCode: membership[0]?.roleCode ?? null,
      roleLabel: membership[0]?.roleLabel ?? null,
      siteId: scope?.scopeId ?? null,
    };
  }

  /** Role catalogue for the organisation — assignable roles with live counts and permission sets. */
  async listRoles(user: AuthenticatedUser) {
    await this.ensureCustomerRoleDefinitions(user.organisationId);

    const roleCodeIds = await Promise.all(
      CUSTOMER_ASSIGNABLE_ROLE_CODES.map((code) => this.typeDefs.id("role_code", code)),
    );

    const rows = await this.db
      .select({
        id: roleDefinitions.id,
        roleCode: typeDefinition.code,
        label: typeDefinition.label,
        isSystemRole: roleDefinitions.isSystemRole,
        sortOrder: typeDefinition.sortOrder,
      })
      .from(roleDefinitions)
      .innerJoin(typeDefinition, eq(roleDefinitions.roleCode, typeDefinition.id))
      .where(
        and(
          eq(roleDefinitions.organisationId, user.organisationId),
          isNull(roleDefinitions.deletedAt),
          inArray(roleDefinitions.roleCode, roleCodeIds),
        ),
      )
      .orderBy(asc(typeDefinition.sortOrder));

    const assignmentCounts = await this.db
      .select({
        roleId: organisationMemberships.roleId,
        assignmentCount: count(),
      })
      .from(organisationMemberships)
      .where(
        and(eq(organisationMemberships.organisationId, user.organisationId), isNull(organisationMemberships.deletedAt)),
      )
      .groupBy(organisationMemberships.roleId);

    const countByRoleId = new Map(assignmentCounts.map((r) => [r.roleId, Number(r.assignmentCount)]));

    return Promise.all(
      rows.map(async (row) => {
        const permissions = Array.from(await this.permissionEvaluation.permissionsForRoleCode(row.roleCode)).sort();
        return {
          id: row.id,
          roleCode: row.roleCode,
          label: row.label,
          isSystemRole: row.isSystemRole,
          release: CORE_ROLE_CODES.has(row.roleCode) ? "Site plan" : "Network+",
          scopeType:
            row.roleCode === "regional_manager"
              ? "region"
              : row.roleCode.includes("site") || row.roleCode === "front_desk_operator" || row.roleCode === "host_staff"
                ? "site"
                : "organisation",
          assignmentCount: countByRoleId.get(row.id) ?? 0,
          permittedActions: permissions,
          lastReview: null as string | null,
          reviewStatus: "active" as const,
        };
      }),
    );
  }

  /** Compact list for invite / change-role pickers. */
  async listAssignableRoles(user: AuthenticatedUser) {
    const roles = await this.listRoles(user);
    return roles.map((r) => ({
      code: r.roleCode,
      label: r.label,
      release: r.release,
      assignmentCount: r.assignmentCount,
    }));
  }
}
