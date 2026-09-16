import { Module } from "@nestjs/common";

import { DevicesModule } from "../devices/devices.module";
import { OrganisationHealthModule } from "../organisation-health/organisation-health.module";
import { SitesModule } from "../sites/sites.module";
import { PlatformDashboardController } from "./platform-dashboard.controller";
import { PlatformDashboardService } from "./platform-dashboard.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — aggregate KPI reads change independently of any
// single underlying capability; only borrows OrganisationHealthService for
// the churn-queue endpoint, and DevicesService/SitesService for the org-
// detail Devices/Sites tabs (their own controllers are customer-scoped to
// the caller's own org, which doesn't fit a platform_support caller).
@Module({
  imports: [OrganisationHealthModule, DevicesModule, SitesModule],
  controllers: [PlatformDashboardController],
  providers: [PlatformDashboardService],
  exports: [PlatformDashboardService],
})
export class PlatformDashboardModule {}
