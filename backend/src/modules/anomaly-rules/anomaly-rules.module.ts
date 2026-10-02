import { Module } from "@nestjs/common";

import { AnomalyRulesController } from "./anomaly-rules.controller";
import { AnomalyRulesService } from "./anomaly-rules.service";

@Module({
  controllers: [AnomalyRulesController],
  providers: [AnomalyRulesService],
  exports: [AnomalyRulesService],
})
export class AnomalyRulesModule {}
