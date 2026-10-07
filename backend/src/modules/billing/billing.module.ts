import { Module } from "@nestjs/common";

import { DocumentsModule } from "../documents/documents.module";
import { TelecomsModule } from "../integrations/telecoms/telecoms.module";
import { KybModule } from "../kyb/kyb.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdumoService } from "./adumo.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [KybModule, DocumentsModule, NotificationsModule, TelecomsModule],
  controllers: [BillingController],
  providers: [BillingService, AdumoService],
  exports: [BillingService],
})
export class BillingModule {}
