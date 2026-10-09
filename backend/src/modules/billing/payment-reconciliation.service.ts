import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { invoice, invoiceCreditNote, paymentReconciliationLog, paymentTransaction } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { findReconciliationBreaks, type ReconciliationBreak } from "./payment-reconciliation";

export interface ReconciliationRunSummary {
  organisations: number;
  breaks: Array<ReconciliationBreak & { organisationId: string }>;
}

/**
 * Runs the scheduled payment reconciliation (MP-4). Each run checks every organisation that has payments, appends one event to
 * that organisation's audit chain (`payments.reconciliation_clean` or `payments.reconciliation_breaks_found`, with the first
 * broken payment as the resource) and logs the break count. A break is also reported to Sentry.
 * Off in tests and when PAYMENT_RECONCILIATION_ENABLED=false; the interval is PAYMENT_RECONCILIATION_INTERVAL_MS (default 24 hours).
 */
@Injectable()
export class PaymentReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private timer: NodeJS.Timeout | null = null;
  private startup: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "test" || process.env.PAYMENT_RECONCILIATION_ENABLED === "false") return;
    const intervalMs = Number(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
    const tick = () => {
      this.reconcileAll().catch((error: unknown) =>
        this.logger.error(`Payment reconciliation failed: ${error instanceof Error ? error.message : String(error)}`),
      );
    };
    this.startup = setTimeout(tick, 15 * 60 * 1000);
    this.timer = setInterval(tick, intervalMs);
    this.startup.unref();
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.startup) clearTimeout(this.startup);
    if (this.timer) clearInterval(this.timer);
  }

  /** Reconciles every organisation that has a payment and records one audit event each. */
  async reconcileAll(now = new Date()): Promise<ReconciliationRunSummary> {
    const orgs = await this.db
      .selectDistinct({ organisationId: paymentTransaction.organisationId })
      .from(paymentTransaction);
    const codeById = new Map<string, string>();
    const resolve = async (id: string) => {
      const known = codeById.get(id);
      if (known) return known;
      const code = (await this.typeDefs.codeById(id)) ?? "unknown";
      codeById.set(id, code);
      return code;
    };

    const all: ReconciliationRunSummary["breaks"] = [];
    for (const { organisationId } of orgs) {
      const [payments, invoices, credits] = await Promise.all([
        this.db.query.paymentTransaction.findMany({ where: eq(paymentTransaction.organisationId, organisationId) }),
        this.db.query.invoice.findMany({
          where: and(eq(invoice.organisationId, organisationId), isNull(invoice.deletedAt)),
        }),
        this.db
          .select({ invoiceId: invoiceCreditNote.invoiceId, amount: invoiceCreditNote.amount })
          .from(invoiceCreditNote)
          .innerJoin(invoice, eq(invoice.id, invoiceCreditNote.invoiceId))
          .where(eq(invoice.organisationId, organisationId)),
      ]);
      const reviewed = new Set(
        payments.length === 0
          ? []
          : (
              await this.db
                .select({ id: paymentReconciliationLog.paymentTransactionId })
                .from(paymentReconciliationLog)
                .where(
                  inArray(
                    paymentReconciliationLog.paymentTransactionId,
                    payments.map((p) => p.id),
                  ),
                )
            ).map((r) => r.id),
      );
      const creditsByInvoice = new Map<string, number>();
      for (const c of credits)
        creditsByInvoice.set(c.invoiceId, (creditsByInvoice.get(c.invoiceId) ?? 0) + Number(c.amount));

      const found = findReconciliationBreaks({
        now,
        invoices: await Promise.all(
          invoices.map(async (i) => ({ id: i.id, amount: String(i.amount), status: await resolve(i.statusCode) })),
        ),
        payments: await Promise.all(
          payments.map(async (p) => ({
            id: p.id,
            invoiceId: p.invoiceId,
            amount: String(p.amount),
            status: await resolve(p.statusCode),
            hasProcessorIndex: Boolean(p.processorTransactionIndex),
            hasReconciliationRow: reviewed.has(p.id),
            occurredAt: p.occurredAt,
          })),
        ),
        creditsByInvoice,
      });

      await appendAuditEvent(this.db, {
        organisationId,
        actorId: null,
        actionCode: found.length === 0 ? "payments.reconciliation_clean" : "payments.reconciliation_breaks_found",
        resourceType: "payment_reconciliation",
        resourceId: found[0]?.paymentId ?? null,
      });
      if (found.length > 0) {
        this.logger.error(
          `Payment reconciliation: organisation ${organisationId} has ${found.length} unexplained breaks`,
        );
        Sentry.captureMessage("Payment reconciliation breaks", {
          level: "error",
          tags: { control: "MP-4" },
          extra: { organisationId, breaks: found.length, kinds: [...new Set(found.map((b) => b.kind))] },
        });
      }
      all.push(...found.map((b) => ({ ...b, organisationId })));
    }
    this.logger.log(`Payment reconciliation: ${orgs.length} organisations, ${all.length} breaks`);
    return { organisations: orgs.length, breaks: all };
  }
}
