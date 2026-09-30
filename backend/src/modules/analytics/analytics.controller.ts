import { BadRequestException, Controller, Get, Header, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { dateRange } from "../analytics-etl/local-date";
import { AnalyticsService, type MixDimension } from "./analytics.service";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;
const MIX_DIMENSIONS: MixDimension[] = ["channel", "visitor_type", "purpose"];

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private range(from: string | undefined, to: string | undefined) {
    if (!from && !to) return this.analyticsService.defaultRange(30);
    if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
      throw new BadRequestException("from and to must be yyyy-MM-dd dates with from on or before to");
    }
    if (dateRange(from, to).length > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }
    return { from, to };
  }

  @Get("visit-activity")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  visitActivity(@Query("days") days: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const parsed = days ? Number(days) : 90;
    const bounded = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 90;
    return this.analyticsService.visitActivity(bounded, user);
  }

  @Get("summary")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  summary(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = this.range(from, to);
    return this.analyticsService.summary(this.analyticsService.scopeFor(user, siteId), r.from, r.to);
  }

  @Get("daily")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  daily(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = this.range(from, to);
    return this.analyticsService.daily(this.analyticsService.scopeFor(user, siteId), r.from, r.to);
  }

  @Get("busy-hours")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  busyHours(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = this.range(from, to);
    return this.analyticsService.busyHours(this.analyticsService.scopeFor(user, siteId), r.from, r.to);
  }

  @Get("mix")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  mix(
    @Query("dimension") dimension: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!dimension || !MIX_DIMENSIONS.includes(dimension as MixDimension)) {
      throw new BadRequestException(`dimension must be one of ${MIX_DIMENSIONS.join(", ")}`);
    }
    const r = this.range(from, to);
    return this.analyticsService.mix(
      this.analyticsService.scopeFor(user, siteId),
      dimension as MixDimension,
      r.from,
      r.to,
    );
  }

  @Get("forecast")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  forecast(
    @Query("horizon") horizon: string | undefined,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const parsed = horizon ? Number(horizon) : 14;
    const bounded = Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 1), 28) : 14;
    return this.analyticsService.forecast(this.analyticsService.scopeFor(user, siteId), bounded);
  }

  @Get("export.csv")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  @AuditLog({ action: "analytics.export", resourceType: "visit_daily_fact" })
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="checkpoint-visit-analytics.csv"')
  exportCsv(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("siteId") siteId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = this.range(from, to);
    return this.analyticsService.exportCsv(this.analyticsService.scopeFor(user, siteId), r.from, r.to);
  }
}
