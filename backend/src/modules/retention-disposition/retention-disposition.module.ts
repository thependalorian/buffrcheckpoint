import { Module } from "@nestjs/common";

import { LegalHoldsModule } from "../legal-holds/legal-holds.module";
import { RetentionDispositionController } from "./retention-disposition.controller";
import { RetentionDispositionService } from "./retention-disposition.service";
import { RetentionDispositionWorkerService } from "./retention-disposition-worker.service";

@Module({
  imports: [LegalHoldsModule],
  controllers: [RetentionDispositionController],
  providers: [RetentionDispositionService, RetentionDispositionWorkerService],
})
export class RetentionDispositionModule {}
