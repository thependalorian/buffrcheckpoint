import { Module } from "@nestjs/common";

import { LegalHoldsModule } from "../legal-holds/legal-holds.module";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";

@Module({
  imports: [LegalHoldsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
