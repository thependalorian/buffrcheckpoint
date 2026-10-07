import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { PublicInvitationsController } from "./public-invitations.controller";

@Module({
  imports: [NotificationsModule],
  controllers: [InvitationsController, PublicInvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
