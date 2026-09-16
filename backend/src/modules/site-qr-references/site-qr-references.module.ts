import { Module } from "@nestjs/common";

import { SiteQrReferencesController } from "./site-qr-references.controller";
import { SiteQrReferencesService } from "./site-qr-references.service";

@Module({
  controllers: [SiteQrReferencesController],
  providers: [SiteQrReferencesService],
  exports: [SiteQrReferencesService],
})
export class SiteQrReferencesModule {}
