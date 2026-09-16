import { Module } from "@nestjs/common";

import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { PublicInvitationsController } from "./public-invitations.controller";

@Module({
  controllers: [InvitationsController, PublicInvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
