import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { Public } from "../../../common/decorators/public.decorator";
import { UssdSessionDto } from "./dto/ussd-session.dto";
import { FeaturePhoneCheckInSessionService } from "./feature-phone-check-in-session.service";
import { TelecomWebhookGuard } from "./telecom-webhook.guard";

@Controller("integrations/telecoms")
export class TelecomsController {
  constructor(private readonly featurePhoneSessions: FeaturePhoneCheckInSessionService) {}

  @Public()
  @UseGuards(TelecomWebhookGuard)
  @Post(":providerCode/ussd-sessions")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  handleUssdSession(@Param("providerCode") providerCode: string, @Body() dto: UssdSessionDto) {
    return this.featurePhoneSessions.openSession({
      providerCode,
      carrierSessionReference: dto.carrierSessionReference,
      providerRequestId: dto.providerRequestId,
      organisationId: dto.organisationId,
      siteId: dto.siteId,
    });
  }
}
