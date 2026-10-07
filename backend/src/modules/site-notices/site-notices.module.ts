import { Module } from "@nestjs/common";

import { SiteQrReferencesModule } from "../site-qr-references/site-qr-references.module";
import { VisitorPolicyModule } from "../visitor-policy/visitor-policy.module";
import { VisitsModule } from "../visits/visits.module";
import { PublicSiteNoticesController, SiteNoticesController } from "./site-notices.controller";
import { SiteNoticesService } from "./site-notices.service";

@Module({
  imports: [SiteQrReferencesModule, VisitorPolicyModule, VisitsModule],
  controllers: [SiteNoticesController, PublicSiteNoticesController],
  providers: [SiteNoticesService],
  exports: [SiteNoticesService],
})
export class SiteNoticesModule {}
