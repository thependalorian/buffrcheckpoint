import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { ScheduledReportsService } from "./scheduled-reports.service";

// Opt-in (SCHEDULED_REPORTS_ENABLED=true): these emails go to real customers.
// Checks every 15 minutes whether a report period is due; the run table makes
// each period send once, so a restart or an extra tick is harmless.
@Injectable()
export class ScheduledReportsWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledReportsWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly reports: ScheduledReportsService) {}

  onModuleInit() {
    if (process.env.SCHEDULED_REPORTS_ENABLED !== "true") {
      this.logger.log("Scheduled reports worker disabled (set SCHEDULED_REPORTS_ENABLED=true to enable)");
      return;
    }
    const intervalMs = Number(process.env.SCHEDULED_REPORTS_INTERVAL_MS ?? 15 * 60 * 1000);
    this.timer = setInterval(() => {
      void this.reports.tick().catch((error) => {
        this.logger.warn(`Scheduled reports tick failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, intervalMs);
    this.logger.log(`Scheduled reports worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
