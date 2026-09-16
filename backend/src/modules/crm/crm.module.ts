import { Module } from "@nestjs/common";

import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — CRM changes for sales-process reasons, independent
// of billing/KYB/incidents.
@Module({
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
