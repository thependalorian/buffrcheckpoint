import { Module } from "@nestjs/common";

import { DocumentsModule } from "../documents/documents.module";
import { KybModule } from "../kyb/kyb.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [KybModule, DocumentsModule, NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
