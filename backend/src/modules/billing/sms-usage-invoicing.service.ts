import { Injectable, Logger } from "@nestjs/common";

import { SmsEntitlementService } from "../integrations/telecoms/sms-entitlement.service";
import { lastClosedBillingMonths } from "../integrations/telecoms/sms-usage-billing";
import { BillingService } from "./billing.service";

/** How many finished months each run looks back over, so a month missed while the worker was off is still billed. */
export const SMS_INVOICING_LOOKBACK_MONTHS = 3;

export interface SmsInvoicingRun {
  months: string[];
  created: number;
  alreadyInvoiced: number;
  failed: number;
}

/**
 * Invoices finished months of text messages. For each of the last few closed months it finds every organisation that sent a text and
 * asks billing to invoice that organisation for that month. Billing makes this safe to repeat: the invoice number is fixed per
 * organisation and month and unique, a month with no texts creates nothing, and a month still in progress is refused. One organisation
 * failing never stops the others.
 */
@Injectable()
export class SmsUsageInvoicingService {
  private readonly logger = new Logger(SmsUsageInvoicingService.name);

  constructor(
    private readonly billing: BillingService,
    private readonly usage: SmsEntitlementService,
  ) {}

  async run(now = new Date()): Promise<SmsInvoicingRun> {
    const months = lastClosedBillingMonths(SMS_INVOICING_LOOKBACK_MONTHS, now);
    const result: SmsInvoicingRun = { months: months.map((m) => m.key), created: 0, alreadyInvoiced: 0, failed: 0 };
    for (const month of months) {
      const organisations = await this.usage.organisationsWithUsage(month.start, month.end);
      for (const organisationId of organisations) {
        try {
          const invoiced = await this.billing.createSmsUsageInvoice(organisationId, month.key);
          if (invoiced.created) result.created += 1;
          else if (invoiced.reason === "already_invoiced") result.alreadyInvoiced += 1;
        } catch (error) {
          result.failed += 1;
          // Error, not warn: a month that is not billed is revenue nobody is told is missing.
          this.logger.error(
            `SMS usage invoice failed [org ${organisationId.slice(0, 8)}, ${month.key}]: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    if (result.created > 0 || result.failed > 0) {
      this.logger.log(
        `SMS usage invoicing: ${result.created} created, ${result.alreadyInvoiced} already invoiced, ${result.failed} failed (${result.months.join(", ")})`,
      );
    }
    return result;
  }
}
