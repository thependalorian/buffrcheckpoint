import { Module } from "@nestjs/common";

import { DocumentsModule } from "../documents/documents.module";
import { TelecomsModule } from "../integrations/telecoms/telecoms.module";
import { KybModule } from "../kyb/kyb.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdumoService } from "./adumo.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { PaymentReconciliationService } from "./payment-reconciliation.service";
import { SmsUsageInvoicingService } from "./sms-usage-invoicing.service";
import { SmsUsageInvoicingWorkerService } from "./sms-usage-invoicing-worker.service";

@Module({
  imports: [KybModule, DocumentsModule, NotificationsModule, TelecomsModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    AdumoService,
    PaymentReconciliationService,
    SmsUsageInvoicingService,
    SmsUsageInvoicingWorkerService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
