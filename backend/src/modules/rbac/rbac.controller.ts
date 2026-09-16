import { Body, Controller, Get, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { ChangeRoleDto } from "./dto/change-role.dto";
import { RbacService } from "./rbac.service";

@Controller("rbac")
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Post("role-assignments/change")
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "role_assignment.change", resourceType: "role_assignment" })
  changeRole(@Body() dto: ChangeRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.rbacService.changeRole(dto, user);
  }

  @Get("users")
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.rbacService.listUsers(user);
  }

  @Get("roles")
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  listRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.rbacService.listRoles(user);
  }
}
