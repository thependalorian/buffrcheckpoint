import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { AnomalyRulesService } from "./anomaly-rules.service";

class UpdateAnomalyRuleBody {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  thresholdInt!: number;

  @IsOptional()
  @IsInt()
  windowMinutes?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  windowStartLocal?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  windowEndLocal?: string;
}

class ReviewAlertBody {
  @IsIn(["acknowledged", "dismissed", "reopened"])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller()
export class AnomalyRulesController {
  constructor(private readonly anomalies: AnomalyRulesService) {}

  @Get("anomaly-alerts")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  list(
    @Query("siteId") siteId: string | undefined,
    @Query("days") days: string | undefined,
    @Query("state") state: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.anomalies.listAlerts(user, { siteId, days: days ? Number(days) : undefined, state });
  }

  @Post("anomaly-alerts/:alertId/review")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  @AuditLog({ action: "anomaly_alert.review", resourceType: "anomaly_alert" })
  review(@Param("alertId") alertId: string, @Body() body: ReviewAlertBody, @CurrentUser() user: AuthenticatedUser) {
    return this.anomalies.reviewAlert(user, alertId, body.status, body.note);
  }

  @Get("sites/:siteId/anomaly-rules")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  rules(@Param("siteId") siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.anomalies.getRules(user, siteId);
  }

  @Put("sites/:siteId/anomaly-rules/:ruleCode")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "site.anomaly_rule.update", resourceType: "site" })
  update(
    @Param("siteId") siteId: string,
    @Param("ruleCode") ruleCode: string,
    @Body() body: UpdateAnomalyRuleBody,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.anomalies.updateRule(user, siteId, ruleCode, body);
  }
}
