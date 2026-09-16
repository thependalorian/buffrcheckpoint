import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  @AuditLog({ action: "invitation.create", resourceType: "visit_invitation" })
  create(@Body() dto: CreateInvitationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invitationsService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  list(
    @Query("siteId") siteId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.listUpcoming(user, siteId, from, to);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invitationsService.getById(id, user);
  }

  @Post(":id/revoke")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  @AuditLog({ action: "invitation.revoke", resourceType: "visit_invitation" })
  revoke(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.revoke(id, reason ?? "revoked", user);
  }

  @Post(":id/match")
  @RequirePermission(PERMISSIONS.VISIT_WRITE)
  match(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invitationsService.matchAtCheckIn(id, user);
  }
}
