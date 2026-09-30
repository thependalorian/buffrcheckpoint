import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsOptional, Matches } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AnalyticsEtlService } from "./analytics-etl.service";
import { addDays, localDateIn } from "./local-date";

class BackfillDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

@Controller("platform/analytics")
export class AnalyticsEtlController {
  constructor(private readonly etl: AnalyticsEtlService) {}

  @Get("etl-runs")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  runs() {
    return this.etl.recentRuns();
  }

  @Post("etl-runs/backfill")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_ANALYTICS_MANAGE)
  @AuditLog({ action: "analytics_etl.backfill", resourceType: "analytics_etl_run" })
  backfill(@Body() dto: BackfillDto, @CurrentUser() user: AuthenticatedUser) {
    return this.etl.runBackfill(dto.from ?? null, dto.to ?? null, user.userId ?? null);
  }

  @Get("arrival-statistics")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  arrivalStatistics(@Query("from") from: string | undefined, @Query("to") to: string | undefined) {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const today = localDateIn(new Date(), process.env.ANALYTICS_TIMEZONE ?? "Africa/Windhoek");
    const rangeTo = to ?? today;
    const rangeFrom = from ?? addDays(rangeTo, -89);
    if (!iso.test(rangeFrom) || !iso.test(rangeTo) || rangeFrom > rangeTo) {
      throw new BadRequestException("from and to must be yyyy-MM-dd dates with from on or before to");
    }
    return this.etl.arrivalStatistics(rangeFrom, rangeTo);
  }
}
