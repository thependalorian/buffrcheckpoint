import { Module } from "@nestjs/common";

import { CapabilityStatusModule } from "../../capability-status/capability-status.module";
import { FeaturePhoneCheckInSessionService } from "./feature-phone-check-in-session.service";
import { SmsContactConfirmationService } from "./sms-contact-confirmation.service";
import { TelecomWebhookGuard } from "./telecom-webhook.guard";
import { TelecomsController } from "./telecoms.controller";

@Module({
  imports: [CapabilityStatusModule],
  controllers: [TelecomsController],
  providers: [FeaturePhoneCheckInSessionService, SmsContactConfirmationService, TelecomWebhookGuard],
  exports: [FeaturePhoneCheckInSessionService, SmsContactConfirmationService],
})
export class TelecomsModule {}
