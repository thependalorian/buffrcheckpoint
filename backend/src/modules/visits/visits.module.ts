import { Module } from "@nestjs/common";

import { InvitationsModule } from "../invitations/invitations.module";
import { KioskExperienceModule } from "../kiosk-experience/kiosk-experience.module";
import { SiteQrReferencesModule } from "../site-qr-references/site-qr-references.module";
import { VisitorPolicyModule } from "../visitor-policy/visitor-policy.module";
import { VisitorWaitQueueModule } from "../visitor-wait-queue/visitor-wait-queue.module";
import { PublicCheckInController, PublicCheckOutController } from "./public-check-in.controller";
import { VisitsController } from "./visits.controller";
import { VisitsService } from "./visits.service";

@Module({
  imports: [
    KioskExperienceModule,
    SiteQrReferencesModule,
    InvitationsModule,
    VisitorWaitQueueModule,
    VisitorPolicyModule,
  ],
  controllers: [VisitsController, PublicCheckInController, PublicCheckOutController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
