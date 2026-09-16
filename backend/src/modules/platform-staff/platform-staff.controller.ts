import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireMfa } from "../../common/decorators/require-mfa.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { type InviteStaffInput, PlatformStaffService } from "./platform-staff.service";

// Buffr's own internal staff list. Every route is scoped to the caller's home
// organisation from their JWT — there is no organisationId parameter to supply.
@Controller("platform/staff")
export class PlatformStaffController {
  constructor(private readonly service: PlatformStaffService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PLATFORM_STAFF_MANAGE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Post("invitations")
  @RequirePermission(PERMISSIONS.PLATFORM_STAFF_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "platform_staff.invite", resourceType: "application_users" })
  invite(@Body() dto: InviteStaffInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.invite(dto, user);
  }

  @Post(":userId/invitations")
  @RequirePermission(PERMISSIONS.PLATFORM_STAFF_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "platform_staff.resend_invite", resourceType: "application_users" })
  resendInvitation(@Param("userId") userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.resendInvitation(userId, user);
  }

  @Patch(":userId/role")
  @RequirePermission(PERMISSIONS.PLATFORM_STAFF_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "platform_staff.set_role", resourceType: "organisation_memberships" })
  setRole(
    @Param("userId") userId: string,
    @Body() body: { roleCode: string; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setRole(userId, body.roleCode, user, body.reason);
  }

  @Delete(":userId")
  @RequirePermission(PERMISSIONS.PLATFORM_STAFF_MANAGE)
  @RequireVerifiedEmail()
  @RequireMfa()
  @AuditLog({ action: "platform_staff.deactivate", resourceType: "application_users" })
  deactivate(
    @Param("userId") userId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deactivate(userId, user, body?.reason);
  }
}
