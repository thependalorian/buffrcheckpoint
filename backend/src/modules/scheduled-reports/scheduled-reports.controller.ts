import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsBoolean, IsString } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { ScheduledReportsService } from "./scheduled-reports.service";

class UpdateReportConfigBody {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  recipientRoles!: string[];
}

@Controller()
export class ScheduledReportsController {
  constructor(private readonly reports: ScheduledReportsService) {}

  @Get("reports/schedules")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.listOrganisationConfigs(user);
  }

  @Get("reports/schedules/runs")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  runs(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.recentRuns(user.organisationId, 20);
  }

  @Put("reports/schedules/:reportCode")
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "scheduled_report.configure", resourceType: "organisation" })
  update(
    @Param("reportCode") reportCode: string,
    @Body() body: UpdateReportConfigBody,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.updateOrganisationConfig(user, reportCode, body);
  }

  @Get("platform/reports/runs")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  platformRuns() {
    return this.reports.recentRuns(null, 50);
  }
}
