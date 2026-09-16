import { Module } from "@nestjs/common";

import { TelecomsModule } from "../integrations/telecoms/telecoms.module";
import { NotificationDispatchWorkerService } from "./notification-dispatch-worker.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { VisitCheckedInListener } from "./visit-checked-in.listener";

@Module({
  imports: [TelecomsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDispatchWorkerService, VisitCheckedInListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
