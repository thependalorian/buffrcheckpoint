import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { appendAuditEvent } from "../../common/audit/audit-chain";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  organisations,
  retentionDispositionRun,
  retentionDispositionRunStatusLog,
  retentionPolicies,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { LegalHoldsService } from "../legal-holds/legal-holds.service";
import { isValidRetentionDays, STANDARD_RETENTION_DAYS } from "../organisation-standards/standard-defaults";
import {
  effectivePolicies,
  holdCoversVisit,
  isExpired,
  notificationRedactionDays,
  retentionDaysFor,
  withPlatformDefault,
} from "./retention-rules";
import { randomUUID } from "node:crypto";

const DAY_MS = 24 * 60 * 60 * 1000;
const DISPOSE_CHUNK = 500;

export interface DispositionRunResult {
  id: string;
  organisationId: string;
  status: "succeeded" | "failed";
  dryRun: boolean;
  candidateCount: number;
  disposedCount: number;
  heldCount: number;
  shreddedSubjectCount: number | null;
  /** Queued messages whose recipient and text were (or, in a dry run, would be) overwritten. Not stored on the run row. */
  redactedNotificationCount: number;
  errorMessage: string | null;
}

// Executes retention policies (buffrcheckpoint.md §8.5, "Retention
// purge/archive job"). Per organisation:
//   1. Effective policy per site = the site's highest-version row, else the
//      organisation default. No policy means nothing is disposed.
//   2. Candidates = live, checked-out visits whose check-out is older than
//      their site's retention period.
//   3. Visits covered by an active legal hold are skipped (held).
//   4. The rest are soft-deleted (deleted_at, status `disposed`, photo and
//      notes cleared) with a visit_status_events row, atomically per chunk.
//   5. Visitor subjects left with no live visits and no live credential have
//      their personal-data envelope replaced by a tombstone and lookup HMACs
//      cleared (crypto-shred), and are soft-deleted.
// Reconciliation: candidates must equal disposed + held. Any difference
// fails the run with both numbers in error_message, same as the analytics
// ETL. A dry run computes the counts and writes only the run row:
// disposed_count then means "would be disposed".
@Injectable()
export class RetentionDispositionService {
  private readonly logger = new Logger(RetentionDispositionService.name);
  private running = false;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly legalHolds: LegalHoldsService,
  ) {}

  async runAll(opts: { dryRun: boolean; requestedBy: string | null }): Promise<DispositionRunResult[] | null> {
    if (this.running) {
      this.logger.warn("Retention disposition skipped: a run is already in progress");
      return null;
    }
    this.running = true;
    try {
      const orgs = await this.db
        .select({ id: organisations.id })
        .from(organisations)
        .where(isNull(organisations.deletedAt));
      const platformDefaultDays = await this.platformDefaultDays();
      const results: DispositionRunResult[] = [];
      for (const org of orgs) {
        results.push(await this.runForOrganisation(org.id, opts, platformDefaultDays));
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  async recentRuns(limit = 50) {
    return this.db.select().from(retentionDispositionRun).orderBy(desc(retentionDispositionRun.startedAt)).limit(limit);
  }

  /** The platform's standard retention (setting `organisation_defaults`, else the built-in 365 days): the floor for every organisation. */
  private async platformDefaultDays(): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT setting_value FROM platform_configuration_setting
      WHERE setting_key = 'organisation_defaults' AND deleted_at IS NULL LIMIT 1`);
    const stored = (result.rows[0] as { setting_value?: { retentionDays?: unknown } } | undefined)?.setting_value?.retentionDays;
    return isValidRetentionDays(stored) ? stored : STANDARD_RETENTION_DAYS;
  }

  private async runForOrganisation(
    organisationId: string,
    opts: { dryRun: boolean; requestedBy: string | null },
    platformDefaultDays: number,
  ): Promise<DispositionRunResult> {
    const [runningCode, succeededCode, failedCode] = await Promise.all([
      this.typeDefs.id("retention_run_status", "running"),
      this.typeDefs.id("retention_run_status", "succeeded"),
      this.typeDefs.id("retention_run_status", "failed"),
    ]);
    const runId = randomUUID();
    const base = { id: runId, organisationId, dryRun: opts.dryRun };

    await this.db.insert(retentionDispositionRun).values({
      ...base,
      statusCode: runningCode,
      requestedBy: opts.requestedBy,
    });
    await this.db.insert(retentionDispositionRunStatusLog).values({
      id: randomUUID(),
      dispositionRunId: runId,
      fromStatusCode: null,
      toStatusCode: runningCode,
    });

    try {
      const now = new Date();
      const { candidates, held, toDispose } = await this.selectCandidates(organisationId, now, platformDefaultDays);

      let disposedCount = toDispose.length;
      let shreddedSubjectCount: number | null = null;
      if (!opts.dryRun) {
        disposedCount = await this.dispose(organisationId, toDispose, now);
        shreddedSubjectCount = await this.shredOrphanedSubjects(organisationId, now);
      }

      const redactedNotificationCount = await this.redactOutbox(organisationId, now, opts);

      const matches = candidates.length === disposedCount + held.length;
      const errorMessage = matches
        ? null
        : `Reconciliation failed: ${candidates.length} candidate visits vs ${disposedCount} disposed + ${held.length} held`;
      const counts = {
        candidateCount: candidates.length,
        disposedCount,
        heldCount: held.length,
        shreddedSubjectCount,
        errorMessage,
      };
      await this.finish(runId, runningCode, matches ? succeededCode : failedCode, counts);
      if (!matches) this.logger.error(`${errorMessage} (organisation ${organisationId})`);

      if (!opts.dryRun) {
        await appendAuditEvent(this.db, {
          organisationId,
          actorId: opts.requestedBy,
          actionCode: "retention.disposition",
          resourceType: "retention_disposition_run",
          resourceId: runId,
        });
      }

      return { ...base, status: matches ? "succeeded" : "failed", ...counts, redactedNotificationCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Retention disposition failed for organisation ${organisationId}: ${message}`);
      const counts = {
        candidateCount: 0,
        disposedCount: 0,
        heldCount: 0,
        shreddedSubjectCount: null,
        errorMessage: message,
      };
      await this.finish(runId, runningCode, failedCode, counts).catch(() => undefined);
      return { ...base, status: "failed", ...counts, redactedNotificationCount: 0 };
    }
  }

  private async selectCandidates(organisationId: string, now: Date, platformDefaultDays: number) {
    const policyRows = await this.db
      .select({
        siteId: retentionPolicies.siteId,
        retentionDays: retentionPolicies.retentionDays,
        version: retentionPolicies.version,
      })
      .from(retentionPolicies)
      .where(and(eq(retentionPolicies.organisationId, organisationId), isNull(retentionPolicies.deletedAt)));
    const policies = withPlatformDefault(effectivePolicies(policyRows), platformDefaultDays);
    const allDays = [...policies.siteDays.values()];
    if (policies.organisationDefaultDays !== null) allDays.push(policies.organisationDefaultDays);
    if (allDays.length === 0) return { candidates: [], held: [], toDispose: [] };

    // Prefilter in SQL with the shortest period; each visit is then checked
    // against its own site's period.
    const earliestCutoff = new Date(now.getTime() - Math.min(...allDays) * DAY_MS);
    const rows = await this.db
      .select({
        id: visitorVisits.id,
        siteId: visitorVisits.siteId,
        visitorId: visitorVisits.visitorId,
        statusCode: visitorVisits.statusCode,
        checkedInAt: visitorVisits.checkedInAt,
        checkedOutAt: visitorVisits.checkedOutAt,
      })
      .from(visitorVisits)
      .where(
        and(
          eq(visitorVisits.organisationId, organisationId),
          isNull(visitorVisits.deletedAt),
          isNotNull(visitorVisits.checkedOutAt),
          lt(visitorVisits.checkedOutAt, earliestCutoff),
        ),
      );

    const candidates = rows.filter((visit) => {
      const days = retentionDaysFor(visit.siteId, policies);
      return days !== null && visit.checkedOutAt !== null && isExpired(visit.checkedOutAt, days, now);
    });

    const holds = await this.legalHolds.activeHoldScopes(organisationId);
    const held = candidates.filter((visit) => holds.some((hold) => holdCoversVisit(hold.scope, visit)));
    const heldIds = new Set(held.map((visit) => visit.id));
    const toDispose = candidates.filter((visit) => !heldIds.has(visit.id));
    return { candidates, held, toDispose };
  }

  // Queued messages hold the recipient's address or mobile number and the message text, which can carry personal sign-out and rating
  // link tokens. Once a message has been delivered (or has stopped being retried) that content has no further use, so it is overwritten
  // after NOTIFICATION_REDACTION_DAYS (default 30). The row, its status and its status events stay, so delivery history and billing
  // reconcile. Reconciliation: candidates must equal redacted, otherwise the run is logged as an error.
  private async redactOutbox(
    organisationId: string,
    now: Date,
    opts: { dryRun: boolean; requestedBy: string | null },
  ): Promise<number> {
    const cutoff = new Date(now.getTime() - notificationRedactionDays(process.env.NOTIFICATION_REDACTION_DAYS) * DAY_MS).toISOString();
    const [sentCode, failedCode] = await Promise.all([
      this.typeDefs.id("notification_delivery_status", "sent"),
      this.typeDefs.id("notification_delivery_status", "failed"),
    ]);
    const eligible = sql`
      organisation_id = ${organisationId}::uuid
      AND status_code IN (${sentCode}::uuid, ${failedCode}::uuid)
      AND coalesce(sent_at, next_attempt_at) < ${cutoff}::timestamptz
      AND recipient_reference <> 'redacted'`;
    if (opts.dryRun) {
      const counted = await this.db.execute(sql`SELECT count(*)::int AS n FROM notification_delivery_instructions WHERE ${eligible}`);
      return Number((counted.rows[0] as { n?: number } | undefined)?.n ?? 0);
    }
    const result = await this.db.execute(sql`
      UPDATE notification_delivery_instructions
      SET recipient_reference = 'redacted', message = '', html = NULL, attachments_json = NULL, subject = NULL, failure_reason = NULL
      WHERE ${eligible}
      RETURNING id`);
    const redacted = result.rows.length;
    if (redacted > 0) {
      await appendAuditEvent(this.db, {
        organisationId,
        actorId: opts.requestedBy,
        actionCode: `notification.outbox.redacted:${redacted}`,
        resourceType: "notification_delivery_instruction",
        resourceId: null,
      });
    }
    return redacted;
  }

  // One statement per chunk: soft-delete and status-log insert commit
  // together, and a visit that changed concurrently (already deleted) gets
  // neither, which then surfaces as a reconciliation difference.
  private async dispose(
    organisationId: string,
    visits: Array<{ id: string; statusCode: string }>,
    now: Date,
  ): Promise<number> {
    const disposedCode = await this.typeDefs.id("visit_status", "disposed");
    const at = now.toISOString();
    let disposed = 0;
    for (let i = 0; i < visits.length; i += DISPOSE_CHUNK) {
      const chunk = visits.slice(i, i + DISPOSE_CHUNK);
      const values = sql.join(
        chunk.map((visit) => sql`(${randomUUID()}::uuid, ${visit.id}::uuid, ${visit.statusCode}::uuid)`),
        sql`, `,
      );
      const result = await this.db.execute(sql`
        WITH x(event_id, visit_id, from_status) AS (VALUES ${values}),
        disposed AS (
          UPDATE visitor_visits v
          SET deleted_at = ${at}::timestamptz, status_code = ${disposedCode}::uuid,
              photo_reference = NULL, notes = NULL
          FROM x
          WHERE v.id = x.visit_id AND v.organisation_id = ${organisationId}::uuid AND v.deleted_at IS NULL
          RETURNING v.id
        )
        INSERT INTO visit_status_events (id, visit_id, from_status_code, to_status_code, occurred_at)
        SELECT x.event_id, x.visit_id, x.from_status, ${disposedCode}::uuid, ${at}::timestamptz
        FROM x JOIN disposed d ON d.id = x.visit_id
        RETURNING visit_id
      `);
      disposed += result.rows.length;
    }
    return disposed;
  }

  // Self-healing: picks up any subject orphaned by this or an earlier run,
  // so a crash between dispose and shred is repaired on the next run.
  private async shredOrphanedSubjects(organisationId: string, now: Date): Promise<number> {
    const at = now.toISOString();
    const tombstone = JSON.stringify({ disposed: true, reason: "retention_policy", disposedAt: at });
    const result = await this.db.execute(sql`
      WITH orphaned AS (
        SELECT s.id FROM visitor_subjects s
        WHERE s.organisation_id = ${organisationId}::uuid
          AND s.deleted_at IS NULL
          AND EXISTS (SELECT 1 FROM visitor_visits v WHERE v.visitor_id = s.id)
          AND NOT EXISTS (SELECT 1 FROM visitor_visits v WHERE v.visitor_id = s.id AND v.deleted_at IS NULL)
          AND NOT EXISTS (SELECT 1 FROM access_credentials c WHERE c.holder_id = s.id AND c.deleted_at IS NULL)
      ),
      shredded AS (
        UPDATE visitor_personal_data p
        SET encrypted_payload = ${tombstone}::jsonb, name_lookup_hmac = NULL, phone_lookup_hmac = NULL,
            last_rotated_at = ${at}::timestamptz
        FROM orphaned o
        WHERE p.visitor_id = o.id
        RETURNING p.visitor_id
      )
      UPDATE visitor_subjects s
      SET deleted_at = ${at}::timestamptz
      FROM orphaned o
      WHERE s.id = o.id
      RETURNING s.id
    `);
    return result.rows.length;
  }

  private async finish(
    runId: string,
    fromStatus: string,
    toStatus: string,
    counts: {
      candidateCount: number;
      disposedCount: number;
      heldCount: number;
      shreddedSubjectCount: number | null;
      errorMessage: string | null;
    },
  ) {
    await this.db
      .update(retentionDispositionRun)
      .set({ statusCode: toStatus, finishedAt: new Date(), ...counts })
      .where(eq(retentionDispositionRun.id, runId));
    await this.db.insert(retentionDispositionRunStatusLog).values({
      id: randomUUID(),
      dispositionRunId: runId,
      fromStatusCode: fromStatus,
      toStatusCode: toStatus,
    });
  }
}
