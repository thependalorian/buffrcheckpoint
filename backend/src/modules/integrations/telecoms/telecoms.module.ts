import { Module } from "@nestjs/common";

import { CapabilityStatusModule } from "../../capability-status/capability-status.module";
import { BulkSmsNamClient } from "./bulksmsnam.client";
import { SmsContactConfirmationService } from "./sms-contact-confirmation.service";
import { SmsEntitlementService } from "./sms-entitlement.service";

@Module({
  imports: [CapabilityStatusModule],
  providers: [BulkSmsNamClient, SmsEntitlementService, SmsContactConfirmationService],
  exports: [SmsContactConfirmationService, SmsEntitlementService],
})
export class TelecomsModule {}
