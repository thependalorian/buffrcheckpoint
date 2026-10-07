import { forwardRef, Module } from "@nestjs/common";

import { TelecomsModule } from "../integrations/telecoms/telecoms.module";
import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module";
import { NotificationDispatchWorkerService } from "./notification-dispatch-worker.service";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { TemplatedEmailService } from "./templated-email.service";
import { TemplatedSmsService } from "./templated-sms.service";
import { VisitCheckedInListener } from "./visit-checked-in.listener";
import { VisitorEmailListener } from "./visitor-email.listener";
import { VisitorSmsListener } from "./visitor-sms.listener";

@Module({
  imports: [TelecomsModule, forwardRef(() => PlatformConfigurationModule)],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    TemplatedEmailService,
    NotificationPreferencesService,
    NotificationDispatchWorkerService,
    VisitCheckedInListener,
    VisitorEmailListener,
    TemplatedSmsService,
    VisitorSmsListener,
  ],
  exports: [NotificationsService, TemplatedEmailService, TemplatedSmsService, NotificationPreferencesService],
})
export class NotificationsModule {}
