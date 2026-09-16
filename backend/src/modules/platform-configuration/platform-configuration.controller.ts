import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import {
  type HealthScoreWeights,
  HEALTH_SCORE_WEIGHTS_KEY,
  PlatformConfigurationService,
} from "./platform-configuration.service";
import {
  PlatformNotificationTemplateService,
  type UpdateTemplateInput,
} from "./platform-notification-template.service";

// Platform-wide config, platform_support-only. Nothing here is tenant-scoped,
// so no @PlatformScoped() and no organisationId anywhere.
@Controller("platform/configuration")
export class PlatformConfigurationController {
  constructor(
    private readonly configuration: PlatformConfigurationService,
    private readonly templates: PlatformNotificationTemplateService,
  ) {}

  @Get("notification-templates")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  listTemplates() {
    return this.templates.list();
  }

  @Get("notification-templates/:templateId/changes")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  templateChanges(@Param("templateId") templateId: string) {
    return this.templates.changeLog(templateId);
  }

  @Patch("notification-templates/:templateId")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  @AuditLog({ action: "platform_notification_template.update", resourceType: "platform_notification_template" })
  updateTemplate(
    @Param("templateId") templateId: string,
    @Body() body: UpdateTemplateInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.update(templateId, body, user);
  }

  @Get("health-score-weights")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  healthScoreWeights() {
    return this.configuration.getHealthScoreWeightsWithMeta();
  }

  @Patch("health-score-weights")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  @AuditLog({ action: "platform_configuration_setting.update", resourceType: "platform_configuration_setting" })
  updateHealthScoreWeights(
    @Body() body: Partial<HealthScoreWeights> & { note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { note, ...weights } = body;
    return this.configuration.updateHealthScoreWeights(weights, user, note);
  }

  @Get("changes")
  @RequirePermission(PERMISSIONS.PLATFORM_CONFIGURATION_MANAGE)
  changeLog(@Query("settingKey") settingKey?: string) {
    return this.configuration.changeLog(settingKey ?? HEALTH_SCORE_WEIGHTS_KEY);
  }
}
