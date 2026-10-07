import { Module } from "@nestjs/common";

import { SiteQrReferencesModule } from "../site-qr-references/site-qr-references.module";
import { VisitorPolicyModule } from "../visitor-policy/visitor-policy.module";
import { KioskExperienceController } from "./kiosk-experience.controller";
import { KioskExperienceService } from "./kiosk-experience.service";

@Module({
  imports: [SiteQrReferencesModule, VisitorPolicyModule],
  controllers: [KioskExperienceController],
  providers: [KioskExperienceService],
  exports: [KioskExperienceService],
})
export class KioskExperienceModule {}
