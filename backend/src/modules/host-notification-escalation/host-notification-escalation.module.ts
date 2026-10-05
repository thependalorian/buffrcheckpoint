import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { HostNotificationEscalationController } from "./host-notification-escalation.controller";
import { HostNotificationEscalationService } from "./host-notification-escalation.service";
import { HostNotificationEscalationEvaluationService } from "./host-notification-escalation-evaluation.service";

@Module({
  imports: [NotificationsModule],
  controllers: [HostNotificationEscalationController],
  providers: [HostNotificationEscalationService, HostNotificationEscalationEvaluationService],
  exports: [HostNotificationEscalationService],
})
export class HostNotificationEscalationModule {}
