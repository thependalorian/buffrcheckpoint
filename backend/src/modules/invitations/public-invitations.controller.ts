import { Controller, Get, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { Public } from "../../common/decorators/public.decorator";
import { InvitationsService } from "./invitations.service";

@Controller("public/invitations")
export class PublicInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Get("resolve")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  resolve(@Query("token") token: string) {
    return this.invitationsService.resolvePublicToken(token);
  }
}
