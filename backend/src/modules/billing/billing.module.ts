import { Module } from "@nestjs/common";

import { KybModule } from "../kyb/kyb.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — billing changes for pricing/invoicing reasons,
// independent of CRM/KYB/incidents.
@Module({
  imports: [KybModule], // BillingService.transitionSubscriptionStatus() gates 'active' on KybService.isVerified()
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
