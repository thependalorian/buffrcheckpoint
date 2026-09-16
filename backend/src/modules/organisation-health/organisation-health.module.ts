import { Module } from "@nestjs/common";

import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module";
import { OrganisationHealthWorkerService } from "./organisation-health-worker.service";
import { OrganisationHealthService } from "./organisation-health.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — churn/health scoring changes on its own
// model-iteration schedule, independent of the console's other
// capabilities.
@Module({
  imports: [PlatformConfigurationModule], // ops-tunable scorecard weights
  providers: [OrganisationHealthService, OrganisationHealthWorkerService],
  exports: [OrganisationHealthService], // PlatformDashboardModule needs this for the churn-queue endpoint
})
export class OrganisationHealthModule {}
