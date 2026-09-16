import { Module } from "@nestjs/common";

import { SiteBrandingController } from "./site-branding.controller";
import { SiteBrandingService } from "./site-branding.service";

@Module({
  controllers: [SiteBrandingController],
  providers: [SiteBrandingService],
  exports: [SiteBrandingService],
})
export class SiteBrandingModule {}
