import { Body, Controller, Get, Post, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateRetentionPolicyDto, UpdateRetentionPolicyDto } from "./dto/retention-policy.dto";
import { RetentionPolicyService } from "./retention-policy.service";

// Section 11.4.3's "Retention Policies" sidebar item — no controller
// existed for this despite the retention_policy schema and
// RETENTION_CONFIGURE permission already being defined.
@Controller("retention-policy")
export class RetentionPolicyController {
  constructor(private readonly retentionPolicyService: RetentionPolicyService) {}

  @Post()
  @RequirePermission(PERMISSIONS.RETENTION_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "retention_policy.create", resourceType: "retention_policy" })
  create(@Body() dto: CreateRetentionPolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.retentionPolicyService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.RETENTION_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.retentionPolicyService.list(user);
  }

  @Get("current")
  @RequirePermission(PERMISSIONS.RETENTION_CONFIGURE)
  getCurrent(@Query("siteId") siteId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.retentionPolicyService.getCurrent(siteId, user);
  }

  // Never a mutation of the current row — always a new, higher-version row
  // (Section 11.4.5a behavioral fix).
  @Post("new-version")
  @RequirePermission(PERMISSIONS.RETENTION_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "retention_policy.new_version", resourceType: "retention_policy" })
  createNewVersion(
    @Query("siteId") siteId: string | undefined,
    @Body() dto: UpdateRetentionPolicyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.retentionPolicyService.createNewVersion(siteId, dto.retentionDays, user);
  }
}
