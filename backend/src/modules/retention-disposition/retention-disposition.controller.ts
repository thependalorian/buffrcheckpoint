import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { RetentionDispositionService } from "./retention-disposition.service";

class RunDispositionDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

@Controller("platform/retention")
export class RetentionDispositionController {
  constructor(private readonly disposition: RetentionDispositionService) {}

  @Get("runs")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  runs() {
    return this.disposition.recentRuns();
  }

  // Runs disposition now for every organisation. Defaults to a dry run:
  // destroying data takes an explicit { "dryRun": false }.
  @Post("runs")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_RETENTION_MANAGE)
  @AuditLog({ action: "retention.disposition.run", resourceType: "retention_disposition_run" })
  run(@Body() dto: RunDispositionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.disposition.runAll({ dryRun: dto.dryRun !== false, requestedBy: user.userId ?? null });
  }
}
