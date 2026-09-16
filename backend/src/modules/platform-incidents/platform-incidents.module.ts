import { Module } from "@nestjs/common";

import { PlatformIncidentsController } from "./platform-incidents.controller";
import { PlatformIncidentsService } from "./platform-incidents.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — incident management changes independently of the
// other capabilities that used to share its module.
@Module({
  controllers: [PlatformIncidentsController],
  providers: [PlatformIncidentsService],
  exports: [PlatformIncidentsService],
})
export class PlatformIncidentsModule {}
