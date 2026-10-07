import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { BreachNoticeService } from "./breach-notice.service";
import { PlatformIncidentsController } from "./platform-incidents.controller";
import { PlatformIncidentsService } from "./platform-incidents.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — incident management changes independently of the
// other capabilities that used to share its module.
@Module({
  imports: [NotificationsModule],
  controllers: [PlatformIncidentsController],
  providers: [PlatformIncidentsService, BreachNoticeService],
  exports: [PlatformIncidentsService],
})
export class PlatformIncidentsModule {}
