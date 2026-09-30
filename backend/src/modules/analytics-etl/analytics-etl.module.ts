import { Module } from "@nestjs/common";

import { AnalyticsEtlController } from "./analytics-etl.controller";
import { AnalyticsEtlService } from "./analytics-etl.service";
import { AnalyticsEtlWorkerService } from "./analytics-etl-worker.service";

@Module({
  controllers: [AnalyticsEtlController],
  providers: [AnalyticsEtlService, AnalyticsEtlWorkerService],
  exports: [AnalyticsEtlService],
})
export class AnalyticsEtlModule {}
