import { Module } from "@nestjs/common";

import { PlatformConfigurationController } from "./platform-configuration.controller";
import { PlatformConfigurationService } from "./platform-configuration.service";
import { PlatformNotificationTemplateService } from "./platform-notification-template.service";

// Platform-wide operational config (migration 0029): editable notification
// copy and the audited health-score weights. Exported because the consumers
// live elsewhere — OrganisationHealthModule reads the weights,
// SupportSessionsModule renders the support-access request template.
@Module({
  controllers: [PlatformConfigurationController],
  providers: [PlatformConfigurationService, PlatformNotificationTemplateService],
  exports: [PlatformConfigurationService, PlatformNotificationTemplateService],
})
export class PlatformConfigurationModule {}
