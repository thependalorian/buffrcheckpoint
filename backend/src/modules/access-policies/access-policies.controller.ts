import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { IsObject } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AccessPoliciesService } from "./access-policies.service";
import { CreateAccessPolicyDto } from "./dto/access-policy.dto";

class UpdateAccessPolicyDto {
  @IsObject()
  config!: Record<string, unknown>;
}

// Section 11.4.3's "Access Policies" sidebar item — no controller existed
// for this despite the access_policy schema already being defined.
@Controller("access-policies")
export class AccessPoliciesController {
  constructor(private readonly accessPoliciesService: AccessPoliciesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "access_policy.create", resourceType: "access_policy" })
  create(@Body() dto: CreateAccessPolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accessPoliciesService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.accessPoliciesService.list(user);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({ action: "access_policy.update", resourceType: "access_policy" })
  update(@Param("id") id: string, @Body() dto: UpdateAccessPolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.accessPoliciesService.update(id, dto.config, user);
  }
}
