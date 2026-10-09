import { Module } from "@nestjs/common";

import { PlatformConfigurationController } from "./platform-configuration.controller";
import { PlatformConfigurationService } from "./platform-configuration.service";
import { PlatformNotificationTemplateService } from "./platform-notification-template.service";

@Module({
  controllers: [PlatformConfigurationController],
  providers: [PlatformConfigurationService, PlatformNotificationTemplateService],
  exports: [PlatformConfigurationService, PlatformNotificationTemplateService],
})
export class PlatformConfigurationModule {}
