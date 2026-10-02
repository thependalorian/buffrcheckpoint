import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { analyticsEtlRun, notificationDeliveryInstructions, pmsSyncRunLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { adumoConfigFromEnv } from "../billing/adumo.service";
import { bankPaymentInstructions } from "../documents/document-renderer.service";

export type IntegrationStatus = "healthy" | "degraded" | "down" | "not_configured";

export interface IntegrationHealth {
  name: string;
  status: IntegrationStatus;
  latencyMs: number | null;
  detail: string;
}

const PROBE_TIMEOUT_MS = 5000;
const ETL_STALE_MS = 3 * 60 * 60 * 1000;

async function timed<T>(probe: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const started = Date.now();
  const value = await Promise.race([
    probe(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), PROBE_TIMEOUT_MS)),
  ]);
  return { value, ms: Date.now() - started };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 160) : "unknown error";
}

// Live probes of every external dependency, for the ops console. Each probe
// is read-only, times out after 5 s and never throws: a failing dependency is
// reported as down with its error, so one outage cannot blank the panel.
// No secrets or customer data are returned, only status and latency.
@Injectable()
export class IntegrationHealthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async check(): Promise<{ checkedAt: string; integrations: IntegrationHealth[] }> {
    const integrations = await Promise.all([
      this.database(),
      this.storage(),
      this.email(),
      this.outbox(),
      this.analyticsEtl(),
      this.cimso(),
      this.cardPayments(),
      Promise.resolve(this.invoiceBankDetails()),
      this.anomalyAlerts(),
      this.scheduledReports(),
    ]);
    return { checkedAt: new Date().toISOString(), integrations };
  }

  private async database(): Promise<IntegrationHealth> {
    try {
      const { ms } = await timed(() => this.db.execute(sql`SELECT 1`));
      return {
        name: "Database (Neon Postgres)",
        status: ms > 1500 ? "degraded" : "healthy",
        latencyMs: ms,
        detail: "Query round trip",
      };
    } catch (error) {
      return { name: "Database (Neon Postgres)", status: "down", latencyMs: null, detail: message(error) };
    }
  }

  private async storage(): Promise<IntegrationHealth> {
    const name = "Document storage";
    const store = (process.env.ARTIFACT_STORE ?? "").trim().toLowerCase();
    if (store === "vercel_blob") {
      return {
        name,
        status: process.env.BLOB_READ_WRITE_TOKEN ? "healthy" : "down",
        latencyMs: null,
        detail: "Vercel Blob (token present; not probed)",
      };
    }
    const endpoint = process.env.NEON_STORAGE_ENDPOINT;
    const bucket = process.env.NEON_STORAGE_BUCKET;
    const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEON_STORAGE_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return { name, status: "not_configured", latencyMs: null, detail: `ARTIFACT_STORE=${store || "unset"}` };
    }
    try {
      const client = new S3Client({
        endpoint,
        region: process.env.NEON_STORAGE_REGION ?? "eu-central-1",
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      const { ms } = await timed(() => client.send(new HeadBucketCommand({ Bucket: bucket })));
      return {
        name,
        status: ms > 2000 ? "degraded" : "healthy",
        latencyMs: ms,
        detail: "Neon object storage bucket reachable",
      };
    } catch (error) {
      return { name, status: "down", latencyMs: null, detail: message(error) };
    }
  }

  private async email(): Promise<IntegrationHealth> {
    const name = "Email (Resend)";
    const key = process.env.RESEND_API_KEY;
    if (!key) return { name, status: "not_configured", latencyMs: null, detail: "RESEND_API_KEY not set" };
    try {
      const { value, ms } = await timed(() =>
        fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } }),
      );
      if (value.ok)
        return { name, status: ms > 2000 ? "degraded" : "healthy", latencyMs: ms, detail: "API key accepted" };
      // A send-only key cannot list domains (401/403) but can still send mail.
      if (value.status === 401 || value.status === 403) {
        return { name, status: "healthy", latencyMs: ms, detail: "Reachable (send-only key)" };
      }
      return { name, status: "degraded", latencyMs: ms, detail: `HTTP ${value.status}` };
    } catch (error) {
      return { name, status: "down", latencyMs: null, detail: message(error) };
    }
  }

  private async outbox(): Promise<IntegrationHealth> {
    const name = "Notification outbox";
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pending, failed] = await Promise.all([
      this.typeDefs.id("notification_delivery_status", "pending"),
      this.typeDefs.id("notification_delivery_status", "failed"),
    ]);
    const [[waiting], [failures]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(notificationDeliveryInstructions)
        .where(
          and(
            eq(notificationDeliveryInstructions.statusCode, pending),
            gte(notificationDeliveryInstructions.nextAttemptAt, since),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(notificationDeliveryInstructions)
        .where(
          and(
            eq(notificationDeliveryInstructions.statusCode, failed),
            gte(notificationDeliveryInstructions.nextAttemptAt, since),
          ),
        ),
    ]);
    const failedCount = failures?.value ?? 0;
    const waitingCount = waiting?.value ?? 0;
    return {
      name,
      status: failedCount > 0 ? "degraded" : "healthy",
      latencyMs: null,
      detail: `${waitingCount} waiting, ${failedCount} failed in the last 24 hours`,
    };
  }

  private async analyticsEtl(): Promise<IntegrationHealth> {
    const name = "Analytics refresh (ETL)";
    const [last] = await this.db.select().from(analyticsEtlRun).orderBy(desc(analyticsEtlRun.startedAt)).limit(1);
    if (!last) return { name, status: "degraded", latencyMs: null, detail: "No run yet" };
    const code = await this.typeDefs.codeById(last.statusCode);
    const age = Date.now() - last.startedAt.getTime();
    const ageText = `last run ${Math.round(age / 60000)} min ago`;
    if (code === "failed") return { name, status: "down", latencyMs: null, detail: `Last run failed; ${ageText}` };
    if (age > ETL_STALE_MS) return { name, status: "degraded", latencyMs: null, detail: `Stale: ${ageText}` };
    return { name, status: "healthy", latencyMs: null, detail: `Reconciled; ${ageText}` };
  }

  private async cimso(): Promise<IntegrationHealth> {
    const name = "CiMSO INNterchange";
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const runs = await this.db
      .select({ outcomeCode: pmsSyncRunLog.outcomeCode, value: count() })
      .from(pmsSyncRunLog)
      .where(gte(pmsSyncRunLog.startedAt, since))
      .groupBy(pmsSyncRunLog.outcomeCode);
    if (runs.length === 0)
      return { name, status: "not_configured", latencyMs: null, detail: "No sync runs in the last 24 hours" };
    let failedRuns = 0;
    let total = 0;
    for (const r of runs) {
      total += r.value;
      if ((await this.typeDefs.codeById(r.outcomeCode)) === "failed") failedRuns += r.value;
    }
    return {
      name,
      status: failedRuns === 0 ? "healthy" : failedRuns === total ? "down" : "degraded",
      latencyMs: null,
      detail: `${total} sync runs in 24 hours, ${failedRuns} failed`,
    };
  }

  // Count only, platform-wide: the alerts themselves belong to each
  // organisation's admin Anomalies page.
  private async anomalyAlerts(): Promise<IntegrationHealth> {
    const name = "Anomaly alerts (24 h)";
    try {
      const result = await this.db.execute(
        sql`SELECT count(*)::int AS n FROM anomaly_alert_events WHERE occurred_at >= NOW() - INTERVAL '24 hours'`,
      );
      const total = Number((result.rows[0] as { n: number }).n);
      return { name, status: "healthy", latencyMs: null, detail: `${total} raised across all sites` };
    } catch (error) {
      return { name, status: "degraded", latencyMs: null, detail: message(error) };
    }
  }

  private async scheduledReports(): Promise<IntegrationHealth> {
    const name = "Scheduled reports";
    if (process.env.SCHEDULED_REPORTS_ENABLED !== "true") {
      return { name, status: "not_configured", latencyMs: null, detail: "SCHEDULED_REPORTS_ENABLED is not true" };
    }
    try {
      const result = await this.db.execute(sql`
        SELECT count(*) FILTER (WHERE t.code = 'failed')::int AS failed, count(*)::int AS total
          FROM scheduled_report_run r JOIN type_definition t ON t.id = r.status_code
         WHERE r.started_at >= NOW() - INTERVAL '7 days'
      `);
      const row = result.rows[0] as { failed: number; total: number };
      const failed = Number(row.failed);
      return {
        name,
        status: failed > 0 ? "degraded" : "healthy",
        latencyMs: null,
        detail: `${Number(row.total)} runs in 7 days, ${failed} failed`,
      };
    } catch (error) {
      return { name, status: "degraded", latencyMs: null, detail: message(error) };
    }
  }

  private invoiceBankDetails(): IntegrationHealth {
    const name = "Invoice bank details";
    const bank = bankPaymentInstructions();
    if (bank.complete)
      return { name, status: "healthy", latencyMs: null, detail: `${bank.bankName}, account and branch set` };
    const missing = [
      !bank.accountNumber && "BILLING_BANK_ACCOUNT_NUMBER",
      !bank.branchCode && "BILLING_BANK_BRANCH_CODE",
    ]
      .filter(Boolean)
      .join(", ");
    return {
      name,
      status: "down",
      latencyMs: null,
      detail: `Invoices go out without bank details. Not set: ${missing}`,
    };
  }

  private async cardPayments(): Promise<IntegrationHealth> {
    const name = "Card payments (Adumo Online)";
    const config = adumoConfigFromEnv();
    if (!config)
      return { name, status: "not_configured", latencyMs: null, detail: "Adumo merchant credentials not set" };
    try {
      const { value, ms } = await timed(() => fetch(config.baseUrl, { method: "HEAD" }));
      return {
        name,
        status: value.status < 500 ? "healthy" : "degraded",
        latencyMs: ms,
        detail: `Gateway reachable (HTTP ${value.status})`,
      };
    } catch (error) {
      return { name, status: "down", latencyMs: null, detail: message(error) };
    }
  }
}
