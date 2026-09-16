import { Module } from "@nestjs/common";

import { LegalHoldsController } from "./legal-holds.controller";
import { LegalHoldsService } from "./legal-holds.service";

@Module({
  controllers: [LegalHoldsController],
  providers: [LegalHoldsService],
  exports: [LegalHoldsService],
})
export class LegalHoldsModule {}
