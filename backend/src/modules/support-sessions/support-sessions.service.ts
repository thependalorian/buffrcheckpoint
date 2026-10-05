import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, count, desc, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";

import { ScopedPermissionEvaluationService } from "../../common/access-control/scoped-permission-evaluation.service";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  organisationMemberships,
  organisations,
  platformSupportAuditEvents,
  platformSupportSession,
  privilegedAccessGrantStatusEvents,
  privilegedAccessGrants,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import { randomUUID } from "node:crypto";

const GRANT_MAX_DURATION_MS = 8 * 60 * 60 * 1000; // 8h ceiling
const SESSION_DURATION_MS = 30 * 60 * 1000; // support sessions are short — re-minted from the same grant if more time is needed
const ADMIN_ROLE_CODES = ["owner_operator", "system_administrator"];

export interface RequestGrantInput {
  organisationId: string;
  reasonCode: string;
  durationMs?: number;
  note?: string;
}

/**
 * Break-glass support access — customer-consent gated (v0.24). A grant is
 * created `pending_customer_approval` and is completely inert (cannot mint
 * a session, RbacGuard's per-request re-check rejects it — see
 * rbac.guard.ts) until an authorized user of the TARGET organisation
 * (owner_operator/system_administrator, `support_access.grant.review`)
 * approves it. The requesting platform_support user can never approve
 * their own request — this is the whole point of the gate.
 */
@Injectable()
export class SupportSessionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly permissionEvaluation: ScopedPermissionEvaluationService,
    private readonly jwt: JwtService,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

  async requestGrant(input: RequestGrantInput, user: AuthenticatedUser) {
    const reasonCode = await this.typeDefs.id("support_access_reason", input.reasonCode);
    const pendingStatus = await this.typeDefs.id("privileged_access_grant_status", "pending_customer_approval");
    const durationMs = Math.min(input.durationMs ?? GRANT_MAX_DURATION_MS, GRANT_MAX_DURATION_MS);

    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, input.organisationId) });
    if (!org) throw new NotFoundException("Organisation not found");

    const [grant] = await this.db
      .insert(privilegedAccessGrants)
      .values({
        id: randomUUID(),
        organisationId: input.organisationId,
        grantedToUserId: user.userId,
        reasonCode,
        statusCode: pendingStatus,
        requestedDurationMs: durationMs,
        requestedBy: user.userId,
      })
      .returning();

    await this.db.insert(privilegedAccessGrantStatusEvents).values({
      id: randomUUID(),
      grantId: grant.id,
      fromStatusCode: null,
      toStatusCode: pendingStatus,
      actorId: user.userId,
      note: input.note,
    });

    await this.notifyOrganisationAdmins(org.id, org.legalName, grant.id, input.note);

    return grant;
  }

  /** Emails every owner_operator/system_administrator of the target org — the actual consent-request notification. */
  private async notifyOrganisationAdmins(
    organisationId: string,
    organisationName: string,
    grantId: string,
    note?: string,
  ) {
    const memberships = await this.db.query.organisationMemberships.findMany({
      where: and(eq(organisationMemberships.organisationId, organisationId), isNull(organisationMemberships.deletedAt)),
    });
    if (memberships.length === 0) return;

    const roleRows = await this.db.query.roleDefinitions.findMany({
      where: inArray(
        roleDefinitions.id,
        memberships.map((m) => m.roleId),
      ),
    });
    const adminRoleIds = new Set<string>();
    for (const role of roleRows) {
      const code = await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, role.roleCode) });
      if (code && ADMIN_ROLE_CODES.includes(code.code)) adminRoleIds.add(role.id);
    }
    const adminUserIds = memberships.filter((m) => adminRoleIds.has(m.roleId)).map((m) => m.userId);
    if (adminUserIds.length === 0) return;

    const users = await this.db.query.applicationUsers.findMany({
      where: and(inArray(applicationUsers.id, adminUserIds), isNull(applicationUsers.deletedAt)),
    });

    // Copy comes from platform_notification_template (ops-editable);
    // TemplatedEmailService applies the Buffr Checkpoint brand shell.
    const noteSuffix = note ? `\n\nNote: ${note}` : "";
    await Promise.all(
      users.map((u) =>
        this.templatedEmail.send({
          templateCode: "support_access_request",
          organisationId,
          to: u.email,
          variables: { organisationName },
          bodySuffix: noteSuffix,
          fallback: {
            subject: "Action needed: Buffr Checkpoint support-access request",
            body: [
              `Buffr Checkpoint's internal support team has requested time-boxed access to ${organisationName}'s account for support purposes.`,
              "Review and approve or deny this request from your admin dashboard under Support Access.",
              "No access is granted until you approve it, and it automatically expires after the approved window.",
            ].join("\n\n"),
          },
        }),
      ),
    );
  }

  /** Customer-side — pending requests against the caller's own org. */
  async listPendingForOrganisation(organisationId: string) {
    const pendingStatus = await this.typeDefs.id("privileged_access_grant_status", "pending_customer_approval");
    const rows = await this.db.query.privilegedAccessGrants.findMany({
      where: and(
        eq(privilegedAccessGrants.organisationId, organisationId),
        eq(privilegedAccessGrants.statusCode, pendingStatus),
        isNull(privilegedAccessGrants.deletedAt),
      ),
      orderBy: desc(privilegedAccessGrants.id),
    });

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        reasonLabel: (await this.typeDefs.codeById(row.reasonCode)) ?? "other",
      })),
    );
  }

  /**
   * Customer-side history — every grant against this organisation that is no
   * longer pending, with the sessions actually minted under each one. The
   * admin support-access screen previously showed only pending requests, so a
   * customer could consent but never afterwards see what was done with that
   * consent; this is the accountability half of the same gate.
   */
  async listHistoryForOrganisation(organisationId: string) {
    const pendingStatus = await this.typeDefs.id("privileged_access_grant_status", "pending_customer_approval");
    const grants = await this.db.query.privilegedAccessGrants.findMany({
      where: and(
        eq(privilegedAccessGrants.organisationId, organisationId),
        ne(privilegedAccessGrants.statusCode, pendingStatus),
        isNull(privilegedAccessGrants.deletedAt),
      ),
      orderBy: desc(privilegedAccessGrants.customerApprovedAt),
      limit: 50,
    });
    if (grants.length === 0) return [];

    const sessions = await this.db.query.platformSupportSession.findMany({
      where: inArray(
        platformSupportSession.grantId,
        grants.map((g) => g.id),
      ),
      orderBy: desc(platformSupportSession.issuedAt),
    });
    const auditCounts = await this.db
      .select({ supportSessionId: platformSupportAuditEvents.supportSessionId, value: count() })
      .from(platformSupportAuditEvents)
      .where(eq(platformSupportAuditEvents.organisationId, organisationId))
      .groupBy(platformSupportAuditEvents.supportSessionId);
    const writeCountBySession = new Map(auditCounts.map((row) => [row.supportSessionId, row.value]));

    const now = Date.now();
    return Promise.all(
      grants.map(async (grant) => {
        const grantSessions = sessions.filter((s) => s.grantId === grant.id);
        const statusCode = grant.statusCode
          ? ((await this.typeDefs.codeById(grant.statusCode)) ?? "unknown")
          : "unknown";
        // An 'active' grant whose window has closed is spent, not live — the
        // status_code is only rewritten on an explicit transition.
        const effectiveStatus =
          statusCode === "active" && grant.expiresAt && grant.expiresAt.getTime() <= now ? "expired" : statusCode;
        return {
          id: grant.id,
          status: effectiveStatus,
          reasonLabel: (await this.typeDefs.codeById(grant.reasonCode)) ?? "other",
          requestedDurationMs: grant.requestedDurationMs,
          customerApprovedAt: grant.customerApprovedAt,
          deniedAt: grant.deniedAt,
          denialReason: grant.denialReason,
          revokedAt: grant.revokedAt,
          startsAt: grant.startsAt,
          expiresAt: grant.expiresAt,
          sessionCount: grantSessions.length,
          lastSessionAt: grantSessions[0]?.issuedAt ?? null,
          recordedWriteCount: grantSessions.reduce((sum, s) => sum + (writeCountBySession.get(s.id) ?? 0), 0),
        };
      }),
    );
  }

  /** Customer-side approval — sets the real time window from now, not from request time. */
  async approveGrant(grantId: string, user: AuthenticatedUser) {
    const grant = await this.requirePendingGrantInCallerOrg(grantId, user);

    const now = new Date();
    const activeStatus = await this.typeDefs.id("privileged_access_grant_status", "active");

    await this.db
      .update(privilegedAccessGrants)
      .set({
        statusCode: activeStatus,
        customerApprovedBy: user.userId,
        customerApprovedAt: now,
        startsAt: now,
        expiresAt: new Date(now.getTime() + grant.requestedDurationMs),
      })
      .where(eq(privilegedAccessGrants.id, grantId));

    await this.db.insert(privilegedAccessGrantStatusEvents).values({
      id: randomUUID(),
      grantId,
      fromStatusCode: grant.statusCode,
      toStatusCode: activeStatus,
      actorId: user.userId,
    });

    const grantRow = await this.db.query.privilegedAccessGrants.findFirst({
      where: eq(privilegedAccessGrants.id, grantId),
    });
    return grantRow ?? null;
  }

  async denyGrant(grantId: string, user: AuthenticatedUser, reason?: string) {
    const grant = await this.requirePendingGrantInCallerOrg(grantId, user);

    const now = new Date();
    const deniedStatus = await this.typeDefs.id("privileged_access_grant_status", "denied");

    await this.db
      .update(privilegedAccessGrants)
      .set({ statusCode: deniedStatus, deniedBy: user.userId, deniedAt: now, denialReason: reason })
      .where(eq(privilegedAccessGrants.id, grantId));

    await this.db.insert(privilegedAccessGrantStatusEvents).values({
      id: randomUUID(),
      grantId,
      fromStatusCode: grant.statusCode,
      toStatusCode: deniedStatus,
      actorId: user.userId,
      note: reason,
    });

    const grantRow = await this.db.query.privilegedAccessGrants.findFirst({
      where: eq(privilegedAccessGrants.id, grantId),
    });
    return grantRow ?? null;
  }

  private async requirePendingGrantInCallerOrg(grantId: string, user: AuthenticatedUser) {
    const pendingStatus = await this.typeDefs.id("privileged_access_grant_status", "pending_customer_approval");
    const grant = await this.db.query.privilegedAccessGrants.findFirst({
      where: and(
        eq(privilegedAccessGrants.id, grantId),
        eq(privilegedAccessGrants.organisationId, user.organisationId),
        eq(privilegedAccessGrants.statusCode, pendingStatus),
      ),
    });
    if (!grant) throw new NotFoundException("No pending support-access request with that id for your organisation");
    // A platform_support requester acting under their own home-org session
    // could otherwise satisfy the organisationId check above if their home
    // org happened to match — belt-and-braces: never allow the requester
    // to be the approver.
    if (grant.requestedBy === user.userId) {
      throw new BadRequestException("You cannot approve or deny your own support-access request");
    }
    return grant;
  }

  /** Platform-side — grants the caller (platform_support) has requested, regardless of status. */
  async listMyGrants(user: AuthenticatedUser) {
    const rows = await this.db.query.privilegedAccessGrants.findMany({
      where: and(eq(privilegedAccessGrants.grantedToUserId, user.userId), isNull(privilegedAccessGrants.deletedAt)),
      orderBy: desc(privilegedAccessGrants.id),
    });
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        status: row.statusCode
          ? ((await this.typeDefs.codeById(row.statusCode)) ?? "pending_customer_approval")
          : "pending_customer_approval",
      })),
    );
  }

  async revokeGrant(grantId: string, user: AuthenticatedUser) {
    const grant = await this.db.query.privilegedAccessGrants.findFirst({
      where: and(eq(privilegedAccessGrants.id, grantId), eq(privilegedAccessGrants.grantedToUserId, user.userId)),
    });
    if (!grant) throw new NotFoundException("Grant not found");

    const revokedStatus = await this.typeDefs.id("privileged_access_grant_status", "revoked");
    await this.db
      .update(privilegedAccessGrants)
      .set({ statusCode: revokedStatus, revokedAt: new Date() })
      .where(eq(privilegedAccessGrants.id, grantId));
    await this.db.insert(privilegedAccessGrantStatusEvents).values({
      id: randomUUID(),
      grantId,
      fromStatusCode: grant.statusCode,
      toStatusCode: revokedStatus,
      actorId: user.userId,
    });

    // Any support session minted from this grant is now dead too —
    // RbacGuard re-checks the grant on every request, so this is defense
    // in depth, not the only enforcement point.
    await this.db
      .update(platformSupportSession)
      .set({ revokedAt: new Date() })
      .where(eq(platformSupportSession.grantId, grantId));
  }

  /**
   * Mints a short-lived support-session JWT scoped to the grant's org.
   * Requires the grant to be customer-approved ('active' status_code) —
   * not just "not revoked and inside a time window," which was the
   * pre-consent-gate check. This token opens admin/ under a visible
   * "acting on behalf of" banner — never a silent impersonation. See
   * rbac.guard.ts for the per-request grant re-check and
   * common/decorators/current-user.decorator.ts for the
   * supportSessionId/supportGrantId claim contract.
   */
  async mintSession(grantId: string, user: AuthenticatedUser) {
    const now = new Date();
    const activeStatus = await this.typeDefs.id("privileged_access_grant_status", "active");
    const grant = await this.db.query.privilegedAccessGrants.findFirst({
      where: and(
        eq(privilegedAccessGrants.id, grantId),
        eq(privilegedAccessGrants.grantedToUserId, user.userId),
        eq(privilegedAccessGrants.statusCode, activeStatus),
        isNull(privilegedAccessGrants.revokedAt),
        isNull(privilegedAccessGrants.deletedAt),
      ),
    });
    if (!grant || !grant.expiresAt || grant.expiresAt <= now) {
      throw new ForbiddenException("No active, customer-approved grant with that id for this user");
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Math.min(now.getTime() + SESSION_DURATION_MS, grant.expiresAt.getTime()));

    await this.db.insert(platformSupportSession).values({
      id: sessionId,
      platformUserId: user.userId,
      grantId: grant.id,
      organisationId: grant.organisationId,
      issuedAt: now,
      expiresAt,
    });

    // Full break-glass edit access, per the confirmed product decision —
    // acting-as permissions mirror owner_operator (the broadest
    // customer-side role) rather than a curated subset, but every write
    // is still attributed to this session and gated on the grant staying
    // active (rbac.guard.ts).
    const permissions = Array.from(await this.permissionEvaluation.permissionsForRoleCode("owner_operator"));

    const accessToken = this.jwt.sign(
      {
        sub: user.userId,
        organisationId: grant.organisationId,
        siteId: null,
        roleCode: "owner_operator",
        permissions,
        emailVerified: true,
        mfaEnabled: true,
        supportSessionId: sessionId,
        supportGrantId: grant.id,
        // Support sessions act inside the customer admin app.
        aud: "admin",
      },
      { expiresIn: Math.round((expiresAt.getTime() - now.getTime()) / 1000) },
    );

    return { accessToken, sessionId, organisationId: grant.organisationId, expiresAt };
  }

  /** Called by admin/'s support-session-aware write paths to record a before/after diff. */
  async recordAuditEvent(input: {
    supportSessionId: string;
    platformUserId: string;
    organisationId: string;
    entityType: string;
    entityId: string;
    action: string;
    beforeValue?: unknown;
    afterValue?: unknown;
  }) {
    await this.db.insert(platformSupportAuditEvents).values({
      id: randomUUID(),
      supportSessionId: input.supportSessionId,
      platformUserId: input.platformUserId,
      organisationId: input.organisationId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeValue: input.beforeValue ?? null,
      afterValue: input.afterValue ?? null,
    });
  }

  async listAuditEvents(filters?: { organisationId?: string; action?: string; from?: string; to?: string }) {
    const clauses = [];
    if (filters?.organisationId) {
      clauses.push(eq(platformSupportAuditEvents.organisationId, filters.organisationId));
    }
    if (filters?.action) {
      clauses.push(eq(platformSupportAuditEvents.action, filters.action));
    }
    if (filters?.from) {
      clauses.push(gte(platformSupportAuditEvents.occurredAt, new Date(filters.from)));
    }
    if (filters?.to) {
      clauses.push(lte(platformSupportAuditEvents.occurredAt, new Date(filters.to)));
    }
    return this.db.query.platformSupportAuditEvents.findMany({
      where: clauses.length ? and(...clauses) : undefined,
      orderBy: desc(platformSupportAuditEvents.occurredAt),
      limit: 200,
    });
  }

  async getAuditEvent(eventId: string) {
    const row = await this.db.query.platformSupportAuditEvents.findFirst({
      where: eq(platformSupportAuditEvents.id, eventId),
    });
    if (!row) throw new NotFoundException("Audit event not found");
    return row;
  }
}
