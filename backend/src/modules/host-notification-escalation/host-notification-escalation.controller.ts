import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateEscalationPolicyDto, CreateEscalationPolicyVersionDto } from "./dto/host-notification-escalation.dto";
import { HostNotificationEscalationService } from "./host-notification-escalation.service";

@Controller("host-notification-escalation")
export class HostNotificationEscalationController {
  constructor(private readonly hostNotificationEscalationService: HostNotificationEscalationService) {}

  @Post()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({
    action: "host_notification_escalation_policy.create",
    resourceType: "host_notification_escalation_policy",
  })
  create(@Body() dto: CreateEscalationPolicyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.hostNotificationEscalationService.createPolicy(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.hostNotificationEscalationService.listPolicies(user);
  }

  @Get(":policyId")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  get(@Param("policyId") policyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hostNotificationEscalationService.getPolicy(policyId, user);
  }

  @Get(":policyId/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  listVersions(@Param("policyId") policyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hostNotificationEscalationService.listVersions(policyId, user);
  }

  @Post(":policyId/versions")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({
    action: "host_notification_escalation_policy_version.create",
    resourceType: "host_notification_escalation_policy_version",
  })
  createVersion(
    @Param("policyId") policyId: string,
    @Body() dto: CreateEscalationPolicyVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hostNotificationEscalationService.createVersion(policyId, dto, user);
  }

  @Post(":policyId/versions/:versionId/publish")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @AuditLog({
    action: "host_notification_escalation_policy_version.publish",
    resourceType: "host_notification_escalation_policy_version",
  })
  publishVersion(
    @Param("policyId") policyId: string,
    @Param("versionId") versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hostNotificationEscalationService.publishVersion(policyId, versionId, user);
  }
}
