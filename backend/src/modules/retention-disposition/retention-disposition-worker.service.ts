import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { RetentionDispositionService } from "./retention-disposition.service";

// Same OnModuleInit/setInterval worker shape as
// analytics-etl/analytics-etl-worker.service.ts, with one deliberate
// difference: this worker is OFF unless RETENTION_DISPOSITION_ENABLED=true.
// Disposition soft-deletes visits and irreversibly shreds personal data, so
// an environment opts in explicitly, normally after a dry run
// (POST /platform/retention/runs with { "dryRun": true }) has been reviewed.
@Injectable()
export class RetentionDispositionWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionDispositionWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private startup: NodeJS.Timeout | null = null;

  constructor(private readonly disposition: RetentionDispositionService) {}

  onModuleInit() {
    if (process.env.RETENTION_DISPOSITION_ENABLED !== "true") {
      this.logger.log("Retention disposition worker disabled (set RETENTION_DISPOSITION_ENABLED=true to enable)");
      return;
    }
    const intervalMs = Number(process.env.RETENTION_DISPOSITION_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
    const tick = () => {
      void this.disposition.runAll({ dryRun: false, requestedBy: null }).catch((error) => {
        this.logger.warn(`Retention disposition run failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    };
    this.startup = setTimeout(tick, 5 * 60 * 1000);
    this.timer = setInterval(tick, intervalMs);
    this.logger.log(`Retention disposition worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.startup) clearTimeout(this.startup);
    if (this.timer) clearInterval(this.timer);
  }
}
