import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { SmsUsageInvoicingService } from "./sms-usage-invoicing.service";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** First run shortly after start, so a deploy on the first of the month does not wait a full interval. */
const FIRST_RUN_DELAY_MS = 90_000;

// Opt-in (SMS_USAGE_INVOICING_ENABLED=true): these invoices go to real customers. Every run is idempotent (one invoice per organisation
// and month), so a restart, an extra tick or two replicas are harmless. Texts only exist once SMS is switched on for an organisation, so
// with SMS off this worker finds nothing to bill.
@Injectable()
export class SmsUsageInvoicingWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsUsageInvoicingWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private first: NodeJS.Timeout | null = null;

  constructor(private readonly invoicing: SmsUsageInvoicingService) {}

  private tick() {
    void this.invoicing.run().catch((error) => {
      this.logger.error(`SMS usage invoicing run failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  onModuleInit() {
    if (process.env.SMS_USAGE_INVOICING_ENABLED !== "true") {
      this.logger.log("SMS usage invoicing worker disabled (set SMS_USAGE_INVOICING_ENABLED=true to enable)");
      return;
    }
    const configured = Number(process.env.SMS_USAGE_INVOICING_INTERVAL_MS);
    const intervalMs = Number.isFinite(configured) && configured >= 60_000 ? configured : DEFAULT_INTERVAL_MS;
    this.first = setTimeout(() => this.tick(), FIRST_RUN_DELAY_MS);
    this.first.unref();
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.timer.unref();
    this.logger.log(`SMS usage invoicing worker started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.first) clearTimeout(this.first);
    if (this.timer) clearInterval(this.timer);
  }
}
