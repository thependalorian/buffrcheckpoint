import { Controller, Get, Query } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("visit-activity")
  @RequirePermission(PERMISSIONS.VISIT_READ_ORG)
  visitActivity(@Query("days") days: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const parsed = days ? Number(days) : 90;
    const bounded = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : 90;
    return this.analyticsService.visitActivity(bounded, user);
  }
}
