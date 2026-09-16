import { Module } from "@nestjs/common";

import { KybController } from "./kyb.controller";
import { KybService } from "./kyb.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — KYB changes for onboarding-compliance reasons,
// independent of billing/CRM/incidents release cadence.
@Module({
  controllers: [KybController],
  providers: [KybService],
  exports: [KybService], // BillingModule needs isVerified() for the subscription-activation gate
})
export class KybModule {}
