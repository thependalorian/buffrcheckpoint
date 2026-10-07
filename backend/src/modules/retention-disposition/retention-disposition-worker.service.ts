import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { RetentionDispositionService } from "./retention-disposition.service";
import { dispositionEnabled, dispositionMode } from "./retention-rules";

// Same OnModuleInit/setInterval worker shape as analytics-etl/analytics-etl-worker.service.ts. Privacy is the product, so this worker is
// ON by default: customers never have to switch retention on. Disposition soft-deletes visits and irreversibly shreds personal data, so a
// new environment is first run with RETENTION_DISPOSITION_MODE=dry_run, the counts are reviewed, and only then moved to live.
// RETENTION_DISPOSITION_ENABLED=false switches the worker off.
@Injectable()
export class RetentionDispositionWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionDispositionWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private startup: NodeJS.Timeout | null = null;

  constructor(private readonly disposition: RetentionDispositionService) {}

  onModuleInit() {
    if (!dispositionEnabled(process.env.RETENTION_DISPOSITION_ENABLED)) {
      this.logger.warn("Retention disposition worker disabled by RETENTION_DISPOSITION_ENABLED=false");
      return;
    }
    const mode = dispositionMode(process.env.RETENTION_DISPOSITION_MODE);
    const intervalMs = Number(process.env.RETENTION_DISPOSITION_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
    const tick = () => {
      void this.disposition.runAll({ dryRun: mode === "dry_run", requestedBy: null }).catch((error) => {
        this.logger.warn(`Retention disposition run failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    };
    this.startup = setTimeout(tick, 5 * 60 * 1000);
    this.timer = setInterval(tick, intervalMs);
    this.logger.log(`Retention disposition worker started (mode ${mode}, interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.startup) clearTimeout(this.startup);
    if (this.timer) clearInterval(this.timer);
  }
}
