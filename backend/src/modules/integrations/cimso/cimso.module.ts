import { Module } from "@nestjs/common";

import { CapabilityStatusModule } from "../../capability-status/capability-status.module";
import { InvitationsModule } from "../../invitations/invitations.module";
import { CimsoCustomerProfileAdapter } from "./adapters/customer-profile.adapter";
import { CimsoFrontDeskAdapter } from "./adapters/front-desk.adapter";
import { CimsoReservationsAdapter } from "./adapters/reservations.adapter";
import { CimsoInnterchangeClient } from "./cimso-innterchange.client";
import { CimsoIntegrationService } from "./cimso-integration.service";
import { CimsoController } from "./cimso.controller";

@Module({
  imports: [CapabilityStatusModule, InvitationsModule],
  controllers: [CimsoController],
  providers: [
    CimsoInnterchangeClient,
    CimsoReservationsAdapter,
    CimsoFrontDeskAdapter,
    CimsoCustomerProfileAdapter,
    CimsoIntegrationService,
  ],
  exports: [CimsoIntegrationService, CimsoInnterchangeClient],
})
export class CimsoModule {}
