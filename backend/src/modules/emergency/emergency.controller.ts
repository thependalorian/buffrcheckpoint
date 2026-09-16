import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { TriggerEmergencyDto } from "./dto/trigger-emergency.dto";
import { EmergencyService } from "./emergency.service";

@Controller("emergency")
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post("trigger")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  @AuditLog({ action: "emergency.trigger", resourceType: "emergency_event" })
  trigger(@Body() dto: TriggerEmergencyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.emergencyService.trigger(dto.siteId, user);
  }

  @Get(":id/roster")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  getRoster(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.emergencyService.getRoster(id, user);
  }

  @Post(":id/resolve")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  @AuditLog({ action: "emergency.resolve", resourceType: "emergency_event" })
  resolve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.emergencyService.resolve(id, user);
  }
}
