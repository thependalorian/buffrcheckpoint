import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { eq } from "drizzle-orm";

import { appendAuditEvent, verifyChain } from "../../common/audit/audit-chain";
import { loadFormerOrganisationIds, loadLegacyForkHeads } from "../../common/audit/legacy-forks";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { auditEvents } from "../../db/schema";

export interface ChainVerificationSummary {
  organisations: number;
  breaks: Array<{ organisationId: string; brokenAtEventId: string | null }>;
}

/**
 * Verifies every organisation's audit hash chain on a schedule and records the result (LG-2).
 * Each run appends `audit.chain_verified` or `audit.chain_break_detected` to the organisation's own chain, so the verification history
 * is itself tamper-evident and visible in the audit log and the evidence pack. A break is also reported to Sentry.
 * Off in tests and when AUDIT_CHAIN_VERIFY_ENABLED=false; the interval is AUDIT_CHAIN_VERIFY_INTERVAL_MS (default 24 hours).
 */
@Injectable()
export class AuditChainVerifierService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditChainVerifierService.name);
  private timer: NodeJS.Timeout | null = null;
  private startup: NodeJS.Timeout | null = null;

  constructor(@Inject(DB) private readonly db: Database) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "test" || process.env.AUDIT_CHAIN_VERIFY_ENABLED === "false") return;
    const intervalMs = Number(process.env.AUDIT_CHAIN_VERIFY_INTERVAL_MS ?? 24 * 60 * 60 * 1000);
    const tick = () => {
      this.verifyAll().catch((error: unknown) =>
        this.logger.error(`Audit chain verification failed: ${error instanceof Error ? error.message : String(error)}`),
      );
    };
    this.startup = setTimeout(tick, 10 * 60 * 1000);
    this.timer = setInterval(tick, intervalMs);
    this.startup.unref();
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.startup) clearTimeout(this.startup);
    if (this.timer) clearInterval(this.timer);
  }

  /** Verifies every organisation that has audit events and records one event per organisation. */
  async verifyAll(): Promise<ChainVerificationSummary> {
    const orgs = await this.db
      .select({ organisationId: auditEvents.organisationId })
      .from(auditEvents)
      .groupBy(auditEvents.organisationId);
    const breaks: ChainVerificationSummary["breaks"] = [];
    const legacyForks = await loadLegacyForkHeads(this.db);
    const formerIds = await loadFormerOrganisationIds(this.db);
    for (const { organisationId } of orgs) {
      const events = await this.db.select().from(auditEvents).where(eq(auditEvents.organisationId, organisationId));
      const result = verifyChain(events, legacyForks, formerIds.get(organisationId) ?? []);
      if (!result.valid) {
        breaks.push({ organisationId, brokenAtEventId: result.brokenAtEventId });
        this.logger.error(`Audit chain break for organisation ${organisationId} at event ${result.brokenAtEventId}`);
        Sentry.captureMessage("Audit chain break detected", {
          level: "error",
          tags: { control: "LG-2" },
          extra: { organisationId, brokenAtEventId: result.brokenAtEventId },
        });
      }
      await appendAuditEvent(this.db, {
        organisationId,
        actorId: null,
        actionCode: result.valid ? "audit.chain_verified" : "audit.chain_break_detected",
        resourceType: "audit_chain",
        resourceId: result.brokenAtEventId,
      });
    }
    this.logger.log(`Audit chains verified: ${orgs.length} organisations, ${breaks.length} breaks`);
    return { organisations: orgs.length, breaks };
  }
}
