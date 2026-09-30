import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { AnalyticsEtlService } from "./analytics-etl.service";

// Same OnModuleInit/setInterval worker shape as
// organisation-health/organisation-health-worker.service.ts — no job-scheduling
// dependency. One incremental run shortly after boot, then every interval.
@Injectable()
export class AnalyticsEtlWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsEtlWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private startup: NodeJS.Timeout | null = null;

  constructor(private readonly etl: AnalyticsEtlService) {}

  onModuleInit() {
    if (process.env.ANALYTICS_ETL_ENABLED === "false") {
      this.logger.log("Analytics ETL worker disabled (ANALYTICS_ETL_ENABLED=false)");
      return;
    }
    const intervalMs = Number(process.env.ANALYTICS_ETL_INTERVAL_MS ?? 60 * 60 * 1000);
    const tick = () => {
      void this.etl.runIncremental().catch((error) => {
        this.logger.warn(`Analytics ETL run failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    };
    this.startup = setTimeout(tick, 60 * 1000);
    this.timer = setInterval(tick, intervalMs);
    this.logger.log(`Analytics ETL worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.startup) clearTimeout(this.startup);
    if (this.timer) clearInterval(this.timer);
  }
}
