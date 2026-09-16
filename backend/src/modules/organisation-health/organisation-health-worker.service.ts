import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { OrganisationHealthService } from "./organisation-health.service";

// Same OnModuleInit/setInterval worker shape as
// notification-dispatch-worker.service.ts and
// host-notification-escalation-evaluation.service.ts — no job-scheduling
// dependency added for this either.
@Injectable()
export class OrganisationHealthWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrganisationHealthWorkerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly health: OrganisationHealthService) {}

  onModuleInit() {
    const intervalMs = Number(process.env.ORG_HEALTH_COMPUTE_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
    this.timer = setInterval(() => {
      void this.health.computeAllSnapshots().catch((error) => {
        this.logger.warn(`Health snapshot compute failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, intervalMs);
    this.logger.log(`Organisation health worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
