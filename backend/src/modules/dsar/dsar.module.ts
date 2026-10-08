import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { DsarController } from "./dsar.controller";
import { DsarService } from "./dsar.service";

@Module({
  imports: [NotificationsModule],
  controllers: [DsarController],
  providers: [DsarService],
  exports: [DsarService],
})
export class DsarModule {}
