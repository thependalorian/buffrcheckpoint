import { Module } from "@nestjs/common";

import { InvitationsModule } from "../invitations/invitations.module";
import { ScheduleController } from "./schedule.controller";

@Module({
  imports: [InvitationsModule],
  controllers: [ScheduleController],
})
export class ScheduleModule {}
