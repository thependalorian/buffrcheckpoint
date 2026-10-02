import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { IsBoolean, IsInt, IsOptional, IsString, Matches } from "class-validator";

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

@Controller()
export class AnomalyRulesController {
  constructor(private readonly anomalies: AnomalyRulesService) {}

  @Get("anomaly-alerts")
  @RequirePermission(PERMISSIONS.VISIT_READ_SITE)
  list(
    @Query("siteId") siteId: string | undefined,
    @Query("days") days: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.anomalies.listAlerts(user, { siteId, days: days ? Number(days) : undefined });
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
