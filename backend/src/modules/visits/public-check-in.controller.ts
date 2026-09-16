import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { Public } from "../../common/decorators/public.decorator";
import { PublicInvitationCheckInDto } from "../invitations/dto/public-invitation-check-in.dto";
import { PublicCheckInDto, PublicCheckOutDto } from "./dto/public-check-in.dto";
import { VisitsService } from "./visits.service";

@Controller("public/check-in")
export class PublicCheckInController {
  constructor(private readonly visitsService: VisitsService) {}

  @Public()
  @Get("context")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  getContext(@Query("site") siteId: string, @Query("ref") referenceId: string) {
    return this.visitsService.getPublicCheckInContext(siteId, referenceId);
  }

  @Public()
  @Get("form")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  getForm(
    @Query("site") siteId: string,
    @Query("ref") referenceId: string,
    @Query("visitorTypeCode") visitorTypeCode: string,
  ) {
    return this.visitsService.getPublicCheckInForm(siteId, referenceId, visitorTypeCode || "general");
  }

  @Public()
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  submit(@Body() dto: PublicCheckInDto) {
    return this.visitsService.publicCheckIn(dto);
  }

  @Public()
  @Post("invitation")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  submitInvitation(@Body() dto: PublicInvitationCheckInDto) {
    return this.visitsService.publicInvitationCheckIn(dto);
  }
}

@Controller("public/check-out")
export class PublicCheckOutController {
  constructor(private readonly visitsService: VisitsService) {}

  @Public()
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  submit(@Body() dto: PublicCheckOutDto) {
    return this.visitsService.publicCheckOut(dto);
  }
}
