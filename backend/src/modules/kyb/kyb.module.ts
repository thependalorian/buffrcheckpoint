import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { KybController } from "./kyb.controller";
import { KybDocumentReaderService } from "./kyb-document-reader.service";
import { KybService } from "./kyb.service";

@Module({
  imports: [NotificationsModule],
  controllers: [KybController],
  providers: [KybService, KybDocumentReaderService],
  exports: [KybService],
})
export class KybModule {}
