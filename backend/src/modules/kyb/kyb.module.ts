import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { KybController } from "./kyb.controller";
import { KybService } from "./kyb.service";

@Module({
  imports: [NotificationsModule],
  controllers: [KybController],
  providers: [KybService],
  exports: [KybService],
})
export class KybModule {}
