import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { type RequestGrantInput, SupportSessionsService } from "./support-sessions.service";

@Controller("platform/support-access")
export class SupportSessionsController {
  constructor(private readonly service: SupportSessionsService) {}

  // Platform side — request a grant against a target org. Inert until that
  // org's own admin approves it (see the customer-side endpoints below).
  @Post("grants")
  @RequirePermission(PERMISSIONS.PLATFORM_SUPPORT_SESSION_REQUEST)
  @AuditLog({ action: "privileged_access_grant.request", resourceType: "privileged_access_grants" })
  requestGrant(@Body() dto: RequestGrantInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.requestGrant(dto, user);
  }

  @Get("grants")
  @RequirePermission(PERMISSIONS.PLATFORM_SUPPORT_SESSION_REQUEST)
  listMyGrants(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyGrants(user);
  }

  @Delete("grants/:grantId")
  @RequirePermission(PERMISSIONS.PLATFORM_SUPPORT_SESSION_REQUEST)
  @AuditLog({ action: "privileged_access_grant.revoke", resourceType: "privileged_access_grants" })
  revokeGrant(@Param("grantId") grantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.revokeGrant(grantId, user);
  }

  @Post("grants/:grantId/session")
  @RequirePermission(PERMISSIONS.PLATFORM_SUPPORT_SESSION_MINT)
  @AuditLog({ action: "platform_support_session.mint", resourceType: "platform_support_session" })
  mintSession(@Param("grantId") grantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.mintSession(grantId, user);
  }

  @Get("audit")
  @RequirePermission(PERMISSIONS.PLATFORM_SUPPORT_SESSION_REQUEST)
  listAuditEvents(
    @Query("organisationId") organisationId?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.service.listAuditEvents({ organisationId, action, from, to });
  }

  @Get("audit/:eventId")
  @RequirePermission(PERMISSIONS.PLATFORM_SUPPORT_SESSION_REQUEST)
  getAuditEvent(@Param("eventId") eventId: string) {
    return this.service.getAuditEvent(eventId);
  }

  // Customer side — reachable from admin/, scoped by TenantScopeGuard to
  // the caller's own organisation like any other admin/ endpoint.
  // SUPPORT_ACCESS_GRANT_REVIEW is granted only to owner_operator/
  // system_administrator (db/migrations/0023...sql).
  @Get("pending")
  @RequirePermission(PERMISSIONS.SUPPORT_ACCESS_GRANT_REVIEW)
  listPending(@Query("organisationId") organisationId: string) {
    return this.service.listPendingForOrganisation(organisationId);
  }

  // Decided/spent grants against the caller's own org — what a customer needs
  // to audit consent after the fact, not just grant it.
  @Get("history")
  @RequirePermission(PERMISSIONS.SUPPORT_ACCESS_GRANT_REVIEW)
  listHistory(@Query("organisationId") organisationId: string) {
    return this.service.listHistoryForOrganisation(organisationId);
  }

  @Patch("grants/:grantId/approve")
  @RequirePermission(PERMISSIONS.SUPPORT_ACCESS_GRANT_REVIEW)
  @AuditLog({ action: "privileged_access_grant.approve", resourceType: "privileged_access_grants" })
  approveGrant(@Param("grantId") grantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approveGrant(grantId, user);
  }

  @Patch("grants/:grantId/deny")
  @RequirePermission(PERMISSIONS.SUPPORT_ACCESS_GRANT_REVIEW)
  @AuditLog({ action: "privileged_access_grant.deny", resourceType: "privileged_access_grants" })
  denyGrant(@Param("grantId") grantId: string, @Body() body: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.denyGrant(grantId, user, body.reason);
  }
}
