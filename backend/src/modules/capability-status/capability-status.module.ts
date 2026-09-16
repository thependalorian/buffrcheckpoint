import { Module } from "@nestjs/common";

import { CapabilityStatusController } from "./capability-status.controller";
import { CapabilityStatusService } from "./capability-status.service";

@Module({
  controllers: [CapabilityStatusController],
  providers: [CapabilityStatusService],
  exports: [CapabilityStatusService],
})
export class CapabilityStatusModule {}
