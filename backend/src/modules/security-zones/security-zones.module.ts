import { Module } from "@nestjs/common";

import { SecurityZonesController } from "./security-zones.controller";
import { SecurityZonesService } from "./security-zones.service";

@Module({
  controllers: [SecurityZonesController],
  providers: [SecurityZonesService],
  exports: [SecurityZonesService],
})
export class SecurityZonesModule {}
