import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { toCsv } from "../../common/export/tabular";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import {
  organisations,
  scheduledReportConfigurations,
  scheduledReportRun,
  scheduledReportRunStatusLog,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { buildSimplePdf } from "../documents/simple-pdf";
import { IntegrationHealthService } from "../integration-health/integration-health.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import { isRealVisit } from "../visits/test-visit-filter";
import { type DueReport, dueReports, type ScheduledReportCode } from "./report-periods";
import { randomUUID } from "node:crypto";

type OrganisationReportCode = Exclude<ScheduledReportCode, "ops_daily_summary">;

interface ReportDefaults {
  cadence: string;
  format: string;
  recipientRoles: string[];
}

// Defaults when an organisation has no configuration row (migration 0046).
export const REPORT_DEFAULTS: Record<ScheduledReportCode, ReportDefaults> = {
  ops_daily_summary: { cadence: "daily_07_windhoek", format: "csv_attachment", recipientRoles: [] },
  site_manager_digest: {
    cadence: "weekly_monday_07",
    format: "pdf_attachment",
    recipientRoles: ["owner_operator", "site_manager"],
  },
  board_compliance_monthly: {
    cadence: "monthly_first_07",
    format: "pdf_attachment",
    recipientRoles: ["owner_operator", "compliance_audit_officer"],
  },
};

/** Roles that may receive organisation reports: admin roles only, never visitors or hosts. */
export const REPORT_RECIPIENT_ROLES = [
  "owner_operator",
  "site_manager",
  "regional_manager",
  "compliance_audit_officer",
  "system_administrator",
];

const ORGANISATION_REPORTS: OrganisationReportCode[] = ["site_manager_digest", "board_compliance_monthly"];

// RFC 2606 / 6761 reserved names never deliver; sending to them only creates
// bounces and failed outbox rows. Demo and seed accounts use them.
const RESERVED_EMAIL_DOMAIN = /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|[^@]+\.(?:test|example|invalid|localhost))$/i;

export function isDeliverableAddress(email: string): boolean {
  return !RESERVED_EMAIL_DOMAIN.test(email.trim());
}

function n(value: unknown): number {
  return Number(value ?? 0);
}

// Scheduled reports. A run row is claimed first (unique per report,
// organisation and period), so a restart or a second instance never sends a
// period twice. Content is aggregates only, from the fact tables and counts;
// no visitor personal data leaves through this path. Delivery goes through the
// notification outbox (retry, backoff, status events).
@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);
  private running = false;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly email: TemplatedEmailService,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      for (const due of dueReports(now)) {
        if (due.reportCode === "ops_daily_summary") {
          await this.runOnce(null, due, () => this.sendOpsSummary(due));
        } else {
          const orgs = await this.db
            .select({ id: organisations.id })
            .from(organisations)
            .where(isNull(organisations.deletedAt));
          for (const org of orgs) {
            await this.runOnce(org.id, due, () => this.sendOrganisationReport(org.id, due));
          }
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Claims the period, runs the sender, records the outcome. Returns false when already claimed. */
  private async runOnce(
    organisationId: string | null,
    due: DueReport,
    send: () => Promise<{ recipients: number; skippedReason?: string }>,
  ): Promise<boolean> {
    const [reportId, runningCode, succeededCode, failedCode, skippedCode] = await Promise.all([
      this.typeDefs.id("scheduled_report_code", due.reportCode),
      this.typeDefs.id("report_run_status", "running"),
      this.typeDefs.id("report_run_status", "succeeded"),
      this.typeDefs.id("report_run_status", "failed"),
      this.typeDefs.id("report_run_status", "skipped"),
    ]);
    const runId = randomUUID();
    const claimed = await this.db
      .insert(scheduledReportRun)
      .values({ id: runId, organisationId, reportCode: reportId, periodKey: due.periodKey, statusCode: runningCode })
      .onConflictDoNothing()
      .returning({ id: scheduledReportRun.id });
    if (claimed.length === 0) return false;
    await this.db.insert(scheduledReportRunStatusLog).values({
      id: randomUUID(),
      organisationId,
      reportRunId: runId,
      fromStatusCode: null,
      toStatusCode: runningCode,
    });

    let finalCode = succeededCode;
    let recipients: number | null = null;
    let errorMessage: string | null = null;
    try {
      const result = await send();
      recipients = result.recipients;
      if (result.skippedReason) {
        finalCode = skippedCode;
        errorMessage = result.skippedReason;
      }
    } catch (error) {
      finalCode = failedCode;
      errorMessage = error instanceof Error ? error.message.slice(0, 500) : String(error);
      this.logger.error(`Scheduled report ${due.reportCode} ${due.periodKey} failed: ${errorMessage}`);
    }
    await this.db
      .update(scheduledReportRun)
      .set({ statusCode: finalCode, recipientCount: recipients, errorMessage, finishedAt: new Date() })
      .where(eq(scheduledReportRun.id, runId));
    await this.db.insert(scheduledReportRunStatusLog).values({
      id: randomUUID(),
      organisationId,
      reportRunId: runId,
      fromStatusCode: runningCode,
      toStatusCode: finalCode,
    });
    return true;
  }

  // ---- Configuration -------------------------------------------------------

  async effectiveConfig(organisationId: string | null, reportCode: ScheduledReportCode) {
    const reportId = await this.typeDefs.id("scheduled_report_code", reportCode);
    const row = await this.db.query.scheduledReportConfigurations.findFirst({
      where: and(
        organisationId
          ? eq(scheduledReportConfigurations.organisationId, organisationId)
          : isNull(scheduledReportConfigurations.organisationId),
        eq(scheduledReportConfigurations.reportCode, reportId),
        isNull(scheduledReportConfigurations.deletedAt),
      ),
    });
    const defaults = REPORT_DEFAULTS[reportCode];
    return {
      reportCode,
      enabled: row?.enabled ?? true,
      cadence: defaults.cadence,
      format: defaults.format,
      recipientRoles: row ? row.recipientReferencesJsonb : defaults.recipientRoles,
      isDefault: !row,
    };
  }

  async listOrganisationConfigs(user: AuthenticatedUser) {
    const labels = await this.db
      .select({ code: typeDefinition.code, label: typeDefinition.label, domain: typeDefinition.domain })
      .from(typeDefinition)
      .where(
        sql`${typeDefinition.domain} IN ('scheduled_report_code', 'schedule_cadence', 'report_format', 'role_code')`,
      );
    const label = (domain: string, code: string) =>
      labels.find((l) => l.domain === domain && l.code === code)?.label ?? code;
    const configs = await Promise.all(
      ORGANISATION_REPORTS.map((code) => this.effectiveConfig(user.organisationId, code)),
    );
    return {
      reports: configs.map((c) => ({
        ...c,
        label: label("scheduled_report_code", c.reportCode),
        cadenceLabel: label("schedule_cadence", c.cadence),
        formatLabel: label("report_format", c.format),
      })),
      recipientRoleOptions: REPORT_RECIPIENT_ROLES.map((code) => ({ code, label: label("role_code", code) })),
    };
  }

  async updateOrganisationConfig(
    user: AuthenticatedUser,
    reportCode: string,
    input: { enabled: boolean; recipientRoles: string[] },
  ) {
    if (!ORGANISATION_REPORTS.includes(reportCode as OrganisationReportCode))
      throw new BadRequestException("Unknown report");
    const roles = [...new Set(input.recipientRoles)];
    if (roles.some((r) => !REPORT_RECIPIENT_ROLES.includes(r))) {
      throw new BadRequestException("Reports can only go to administrative roles");
    }
    const code = reportCode as OrganisationReportCode;
    const defaults = REPORT_DEFAULTS[code];
    const [reportId, cadenceId, formatId] = await Promise.all([
      this.typeDefs.id("scheduled_report_code", code),
      this.typeDefs.id("schedule_cadence", defaults.cadence),
      this.typeDefs.id("report_format", defaults.format),
    ]);
    const existing = await this.db.query.scheduledReportConfigurations.findFirst({
      where: and(
        eq(scheduledReportConfigurations.organisationId, user.organisationId),
        eq(scheduledReportConfigurations.reportCode, reportId),
        isNull(scheduledReportConfigurations.deletedAt),
      ),
    });
    const values = {
      enabled: input.enabled,
      recipientReferencesJsonb: roles,
      updatedAt: new Date(),
      updatedBy: user.userId,
    };
    if (existing) {
      await this.db
        .update(scheduledReportConfigurations)
        .set(values)
        .where(eq(scheduledReportConfigurations.id, existing.id));
    } else {
      await this.db.insert(scheduledReportConfigurations).values({
        id: randomUUID(),
        organisationId: user.organisationId,
        reportCode: reportId,
        cadenceCode: cadenceId,
        formatCode: formatId,
        ...values,
      });
    }
    return this.listOrganisationConfigs(user);
  }

  async recentRuns(organisationId: string | null, limit = 30) {
    const rows = await this.db
      .select({
        id: scheduledReportRun.id,
        organisationId: scheduledReportRun.organisationId,
        reportCode: typeDefinition.code,
        periodKey: scheduledReportRun.periodKey,
        statusCode: scheduledReportRun.statusCode,
        recipientCount: scheduledReportRun.recipientCount,
        errorMessage: scheduledReportRun.errorMessage,
        startedAt: scheduledReportRun.startedAt,
        finishedAt: scheduledReportRun.finishedAt,
      })
      .from(scheduledReportRun)
      .innerJoin(typeDefinition, eq(typeDefinition.id, scheduledReportRun.reportCode))
      .where(organisationId ? eq(scheduledReportRun.organisationId, organisationId) : undefined)
      .orderBy(desc(scheduledReportRun.startedAt))
      .limit(limit);
    return Promise.all(rows.map(async (r) => ({ ...r, status: await this.typeDefs.codeById(r.statusCode) })));
  }

  // ---- Recipients ----------------------------------------------------------

  /** Verified, active users of this organisation holding one of the roles. */
  private async recipientEmails(organisationId: string, roles: string[]): Promise<string[]> {
    if (roles.length === 0) return [];
    const result = await this.db.execute(sql`
      SELECT DISTINCT lower(u.email) AS email
        FROM organisation_memberships m
        JOIN application_users u ON u.id = m.user_id
        JOIN role_definitions rd ON rd.id = m.role_id
        JOIN type_definition rc ON rc.id = rd.role_code
       WHERE m.organisation_id = ${organisationId}
         AND m.deleted_at IS NULL
         AND u.deleted_at IS NULL
         AND u.email_verified_at IS NOT NULL
         AND rc.domain = 'role_code'
         AND rc.code IN (${sql.join(
           roles.map((role) => sql`${role}`),
           sql`, `,
         )})
    `);
    return (result.rows as { email: string }[]).map((r) => r.email).filter(isDeliverableAddress);
  }

  // ---- Ops daily summary ---------------------------------------------------

  private async sendOpsSummary(due: DueReport) {
    const config = await this.effectiveConfig(null, "ops_daily_summary");
    if (!config.enabled) return { recipients: 0, skippedReason: "Disabled" };
    const to = TemplatedEmailService.resolveOpsInbox();
    if (!to) return { recipients: 0, skippedReason: "No ops inbox configured (CONTACT_OPS_EMAIL)" };
    const organisationId = await this.opsOrganisationId(to);
    if (!organisationId) return { recipients: 0, skippedReason: "No organisation to attribute the ops email to" };

    const health = await this.integrationHealth.check();
    const result = await this.db.execute(sql`
      SELECT
        (SELECT COALESCE(sum(check_in_count), 0)::int FROM visit_daily_fact WHERE local_date = ${due.from}::date) AS check_ins,
        (SELECT count(*)::int FROM platform_incident i JOIN type_definition t ON t.id = i.status_code
          WHERE i.deleted_at IS NULL AND t.code <> 'resolved') AS open_incidents,
        (SELECT count(*)::int FROM support_ticket s JOIN type_definition t ON t.id = s.status_code
          WHERE s.deleted_at IS NULL AND t.code IN ('open', 'in_progress', 'waiting_on_customer')) AS open_tickets,
        (SELECT count(*)::int FROM payment_transaction p JOIN type_definition t ON t.id = p.status_code
          WHERE t.code = 'pending_review') AS payments_pending_review,
        (SELECT count(*)::int FROM anomaly_alert_events a
          WHERE a.occurred_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
            AND a.occurred_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')) AS anomaly_alerts
    `);
    const row = result.rows[0] as Record<string, unknown>;
    const problems = health.integrations.filter((i) => i.status === "down" || i.status === "degraded");

    const lines = [
      `Ops summary for ${due.from} (Africa/Windhoek).`,
      "",
      problems.length === 0
        ? "Integrations: nothing down or degraded."
        : `Integrations needing attention: ${problems.map((p) => `${p.name} (${p.status}: ${p.detail})`).join("; ")}.`,
      `Check-ins yesterday: ${n(row.check_ins)}.`,
      `Open incidents: ${n(row.open_incidents)}. Open support tickets: ${n(row.open_tickets)}.`,
      `Payments waiting for proof-of-payment review: ${n(row.payments_pending_review)}.`,
      `Anomaly alerts raised yesterday: ${n(row.anomaly_alerts)}.`,
      "",
      "The attached CSV lists every integration check.",
    ];
    const csv = toCsv({
      headers: ["integration", "status", "latency_ms", "detail"],
      rows: health.integrations.map((i) => [i.name, i.status, i.latencyMs, i.detail]),
    });
    await this.email.send({
      templateCode: "scheduled_ops_daily_summary",
      organisationId,
      to,
      // The seeded template says {{period}}; callers used to pass only {{date}}, so the subject and body went out reading
      // "Buffr Checkpoint daily summary, {{period}}".
      variables: { period: due.from, date: due.from },
      fallback: { subject: `Checkpoint ops summary, ${due.from}`, body: lines.join("\n") },
      attachments: [
        {
          filename: `ops-summary-${due.from}.csv`,
          contentBase64: Buffer.from(csv, "utf8").toString("base64"),
          contentType: "text/csv",
        },
      ],
    });
    return { recipients: 1 };
  }

  private async opsOrganisationId(opsInbox: string): Promise<string | null> {
    const result = await this.db.execute(sql`
      SELECT organisation_id FROM application_users
       WHERE deleted_at IS NULL AND lower(email) = ${opsInbox.toLowerCase()} LIMIT 1
    `);
    const byInbox = (result.rows[0] as { organisation_id?: string } | undefined)?.organisation_id;
    if (byInbox) return byInbox;
    const any = await this.db.execute(
      sql`SELECT organisation_id FROM application_users WHERE deleted_at IS NULL LIMIT 1`,
    );
    return (any.rows[0] as { organisation_id?: string } | undefined)?.organisation_id ?? null;
  }

  // ---- Organisation reports -----------------------------------------------

  private async sendOrganisationReport(organisationId: string, due: DueReport) {
    const code = due.reportCode as OrganisationReportCode;
    const config = await this.effectiveConfig(organisationId, code);
    if (!config.enabled) return { recipients: 0, skippedReason: "Disabled by the organisation" };
    const recipients = await this.recipientEmails(organisationId, config.recipientRoles);
    if (recipients.length === 0) return { recipients: 0, skippedReason: "No verified users hold the recipient roles" };

    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    const orgName = org?.tradingName || org?.legalName || "Your organisation";
    const lines = await this.organisationReportLines(organisationId, due, code === "board_compliance_monthly");
    const title =
      code === "site_manager_digest"
        ? `${orgName}: weekly site digest, ${due.from} to ${due.to}`
        : `${orgName}: monthly board and compliance pack, ${due.periodKey}`;
    const pdf = buildSimplePdf(lines, title);
    const filename = `${code === "site_manager_digest" ? "weekly-digest" : "monthly-pack"}-${due.periodKey}.pdf`;

    for (const to of recipients) {
      await this.email.send({
        templateCode: `scheduled_${code}`,
        organisationId,
        to,
        variables: { organisationName: orgName, from: due.from, to: due.to, period: due.periodKey },
        fallback: {
          subject: title,
          body: [
            `Your ${code === "site_manager_digest" ? "weekly site digest" : "monthly board and compliance pack"} for ${orgName} is attached.`,
            `It covers ${due.from} to ${due.to} and contains totals only, no visitor details.`,
            "",
            "Change who receives this, or switch it off, under Settings > Scheduled reports in the admin dashboard.",
          ].join("\n"),
        },
        attachments: [{ filename, contentBase64: pdf.toString("base64"), contentType: "application/pdf" }],
      });
    }
    return { recipients: recipients.length };
  }

  private async organisationReportLines(organisationId: string, due: DueReport, monthly: boolean): Promise<string[]> {
    const totals = (
      await this.db.execute(sql`
        SELECT
          (SELECT COALESCE(sum(check_in_count), 0)::int FROM visit_daily_fact
            WHERE organisation_id = ${organisationId} AND local_date BETWEEN ${due.from}::date AND ${due.to}::date) AS check_ins,
          (SELECT COALESCE(sum(offline_captured_count), 0)::int FROM visit_daily_fact
            WHERE organisation_id = ${organisationId} AND local_date BETWEEN ${due.from}::date AND ${due.to}::date) AS offline,
          (SELECT COALESCE(sum(response_count), 0)::int FROM visit_survey_daily_fact
            WHERE organisation_id = ${organisationId} AND local_date BETWEEN ${due.from}::date AND ${due.to}::date) AS survey_responses,
          (SELECT COALESCE(sum(rating_total), 0)::int FROM visit_survey_daily_fact
            WHERE organisation_id = ${organisationId} AND local_date BETWEEN ${due.from}::date AND ${due.to}::date) AS survey_rating_total,
          (SELECT count(*)::int FROM visitor_visits
            WHERE organisation_id = ${organisationId} AND deleted_at IS NULL AND checked_out_at IS NULL
              AND ${isRealVisit(sql`arrival_channel_code`)}) AS open_visits,
          (SELECT count(*) FILTER (WHERE sent_at IS NOT NULL)::int FROM notification_delivery_instructions
            WHERE organisation_id = ${organisationId}
              AND next_attempt_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
              AND next_attempt_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')) AS notifications_sent,
          (SELECT count(*)::int FROM notification_delivery_instructions
            WHERE organisation_id = ${organisationId}
              AND next_attempt_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
              AND next_attempt_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')) AS notifications_total
      `)
    ).rows[0] as Record<string, unknown>;

    const bySite = (
      await this.db.execute(sql`
        SELECT s.name AS site, COALESCE(sum(f.check_in_count), 0)::int AS check_ins
          FROM sites s
          LEFT JOIN visit_daily_fact f ON f.site_id = s.id AND f.local_date BETWEEN ${due.from}::date AND ${due.to}::date
         WHERE s.organisation_id = ${organisationId} AND s.deleted_at IS NULL
         GROUP BY s.name ORDER BY check_ins DESC LIMIT 12
      `)
    ).rows as { site: string; check_ins: number }[];

    const alerts = (
      await this.db.execute(sql`
        SELECT t.label AS rule, count(*)::int AS n
          FROM anomaly_alert_events a JOIN type_definition t ON t.id = a.rule_code
         WHERE a.organisation_id = ${organisationId}
           AND a.occurred_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
           AND a.occurred_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')
         GROUP BY t.label ORDER BY n DESC
      `)
    ).rows as { rule: string; n: number }[];

    const responses = n(totals.survey_responses);
    const sent = n(totals.notifications_sent);
    const total = n(totals.notifications_total);
    const lines = [
      `Period: ${due.from} to ${due.to} (site local dates).`,
      "",
      `Check-ins: ${n(totals.check_ins)} (captured offline: ${n(totals.offline)}).`,
      `Visits still open now: ${n(totals.open_visits)}.`,
      total > 0
        ? `Host notifications delivered: ${sent} of ${total} (${Math.round((sent / total) * 100)}%).`
        : "Host notifications: none in this period.",
      responses > 0
        ? `Visitor satisfaction: average ${(n(totals.survey_rating_total) / responses).toFixed(1)} out of 5 from ${responses} responses (target 4.0 or higher).`
        : "Visitor satisfaction: no survey responses in this period.",
      "",
      "Check-ins by site:",
      ...(bySite.length ? bySite.map((r) => `  ${r.site}: ${n(r.check_ins)}`) : ["  No sites."]),
      "",
      "Anomaly alerts:",
      ...(alerts.length ? alerts.map((a) => `  ${a.rule}: ${n(a.n)}`) : ["  None."]),
    ];

    if (monthly) {
      const compliance = (
        await this.db.execute(sql`
          SELECT
            (SELECT count(*)::int FROM audit_events
              WHERE organisation_id = ${organisationId}
                AND occurred_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
                AND occurred_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')) AS audit_events,
            (SELECT count(*)::int FROM retention_disposition_run
              WHERE organisation_id = ${organisationId}
                AND started_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
                AND started_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')) AS retention_runs,
            (SELECT COALESCE(sum(disposed_count), 0)::int FROM retention_disposition_run
              WHERE organisation_id = ${organisationId}
                AND started_at >= (${due.from}::date AT TIME ZONE 'Africa/Windhoek')
                AND started_at < ((${due.to}::date + 1) AT TIME ZONE 'Africa/Windhoek')) AS disposed
        `)
      ).rows[0] as Record<string, unknown>;
      lines.push(
        "",
        "Compliance:",
        `  Audit events recorded: ${n(compliance.audit_events)} (hash-chained; verify in the Audit Log page).`,
        `  Retention runs: ${n(compliance.retention_runs)}; visits disposed under policy: ${n(compliance.disposed)}.`,
      );
    }
    lines.push("", "Totals only. No visitor personal data is included in this report.");
    return lines;
  }
}
