import { Module } from "@nestjs/common";

import { IntegrationHealthModule } from "../integration-health/integration-health.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ScheduledReportsController } from "./scheduled-reports.controller";
import { ScheduledReportsService } from "./scheduled-reports.service";
import { ScheduledReportsWorkerService } from "./scheduled-reports-worker.service";

@Module({
  imports: [NotificationsModule, IntegrationHealthModule],
  controllers: [ScheduledReportsController],
  providers: [ScheduledReportsService, ScheduledReportsWorkerService],
})
export class ScheduledReportsModule {}
