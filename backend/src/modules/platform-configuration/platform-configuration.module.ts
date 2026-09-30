import { Module, forwardRef } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PlatformConfigurationController } from "./platform-configuration.controller";
import { PlatformConfigurationService } from "./platform-configuration.service";
import { PlatformNotificationTemplateService } from "./platform-notification-template.service";

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [PlatformConfigurationController],
  providers: [PlatformConfigurationService, PlatformNotificationTemplateService],
  exports: [PlatformConfigurationService, PlatformNotificationTemplateService],
})
export class PlatformConfigurationModule {}
