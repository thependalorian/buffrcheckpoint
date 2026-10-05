import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import {
  VISIT_ROSTER_CHANGED_EVENT,
  type VisitRosterChangedEvent,
} from "../../common/domain-events/visit-roster-changed.event";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import {
  anomalyAlertEvents,
  anomalyAlertStatusEvents,
  securityZones,
  siteAnomalyRuleConfigurations,
  sites,
  typeDefinition,
  visitorPersonalData,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { isRealVisit } from "../visits/test-visit-filter";
import {
  ANOMALY_RULE_CODES,
  ANOMALY_RULE_DEFAULTS,
  type AnomalyRuleCode,
  type AnomalyRuleConfig,
  afterHoursTriggered,
  localTimeIn,
  repeatPhoneTriggered,
} from "./anomaly-rules";
import { randomUUID } from "node:crypto";

export interface UpdateAnomalyRuleInput {
  enabled: boolean;
  thresholdInt: number;
  windowMinutes?: number | null;
  windowStartLocal?: string | null;
  windowEndLocal?: string | null;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Live anomaly rules (migration 0045). Evaluated on every check-in from the
// same in-process signal that drives the live roster. Alerts are for people
// only: nothing here blocks, delays or denies a visitor (Section 7.2). A rule
// failure is logged and never breaks the check-in that triggered it.
@Injectable()
export class AnomalyRulesService {
  private readonly logger = new Logger(AnomalyRulesService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  @OnEvent(VISIT_ROSTER_CHANGED_EVENT, { async: true })
  async onRosterChanged(event: VisitRosterChangedEvent) {
    if (event.reason !== "checked_in" || !event.visitId) return;
    try {
      await this.evaluateCheckIn(event.visitId);
    } catch (error) {
      this.logger.error(
        `Anomaly evaluation failed for visit ${event.visitId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async effectiveConfigs(organisationId: string, siteId: string): Promise<AnomalyRuleConfig[]> {
    const ruleIds = await Promise.all(ANOMALY_RULE_CODES.map((code) => this.typeDefs.id("anomaly_rule_code", code)));
    const rows = await this.db.query.siteAnomalyRuleConfigurations.findMany({
      where: and(
        eq(siteAnomalyRuleConfigurations.organisationId, organisationId),
        eq(siteAnomalyRuleConfigurations.siteId, siteId),
        isNull(siteAnomalyRuleConfigurations.deletedAt),
      ),
    });
    return ANOMALY_RULE_CODES.map((ruleCode, i) => {
      const row = rows.find((r) => r.ruleCode === ruleIds[i]);
      if (!row) return { ruleCode, isDefault: true, ...ANOMALY_RULE_DEFAULTS[ruleCode] };
      return {
        ruleCode,
        isDefault: false,
        enabled: row.enabled,
        thresholdInt: row.thresholdInt,
        windowMinutes: row.windowMinutes,
        windowStartLocal: row.windowStartLocal?.slice(0, 5) ?? null,
        windowEndLocal: row.windowEndLocal?.slice(0, 5) ?? null,
      };
    });
  }

  async evaluateCheckIn(visitId: string) {
    const visit = await this.db.query.visitorVisits.findFirst({
      where: and(
        eq(visitorVisits.id, visitId),
        isNull(visitorVisits.deletedAt),
        isRealVisit(visitorVisits.arrivalChannelCode),
      ),
    });
    if (!visit) return;
    const site = await this.db.query.sites.findFirst({ where: eq(sites.id, visit.siteId) });
    if (!site) return;
    const configs = await this.effectiveConfigs(visit.organisationId, visit.siteId);
    const config = (code: AnomalyRuleCode) => configs.find((c) => c.ruleCode === code) as AnomalyRuleConfig;
    const checkedInAt = visit.checkedInAt ?? new Date();

    // Rule 1: the same phone checking in repeatedly at one site.
    const repeat = config("repeat_phone_window");
    if (repeat.enabled && visit.visitorId) {
      const personal = await this.db.query.visitorPersonalData.findFirst({
        where: eq(visitorPersonalData.visitorId, visit.visitorId),
      });
      const phoneHmac = personal?.phoneLookupHmac;
      if (phoneHmac) {
        const windowMinutes = repeat.windowMinutes ?? 30;
        const since = new Date(checkedInAt.getTime() - windowMinutes * 60_000);
        const [row] = await this.db
          .select({ value: count() })
          .from(visitorVisits)
          .innerJoin(visitorPersonalData, eq(visitorPersonalData.visitorId, visitorVisits.visitorId))
          .where(
            and(
              eq(visitorVisits.organisationId, visit.organisationId),
              eq(visitorVisits.siteId, visit.siteId),
              isNull(visitorVisits.deletedAt),
              gte(visitorVisits.checkedInAt, since),
              eq(visitorPersonalData.phoneLookupHmac, phoneHmac),
            ),
          );
        const checkIns = row?.value ?? 0;
        if (repeatPhoneTriggered(checkIns, repeat)) {
          await this.raise({
            organisationId: visit.organisationId,
            siteId: visit.siteId,
            ruleCode: "repeat_phone_window",
            visitId: visit.id,
            subjectReference: phoneHmac,
            dedupeSince: since,
            payload: { checkIns, threshold: repeat.thresholdInt, windowMinutes },
          });
        }
      }
    }

    // Rule 2: check-in to a restricted zone outside visitor hours.
    const afterHours = config("after_hours_restricted_zone");
    if (afterHours.enabled && visit.zoneId) {
      const zone = await this.db.query.securityZones.findFirst({ where: eq(securityZones.id, visit.zoneId) });
      let tier: number | null = null;
      let tierCode: string | null = null;
      if (zone?.riskTierCode) {
        const [td] = await this.db
          .select({ sortOrder: typeDefinition.sortOrder, code: typeDefinition.code })
          .from(typeDefinition)
          .where(eq(typeDefinition.id, zone.riskTierCode));
        tier = td?.sortOrder ?? null;
        tierCode = td?.code ?? null;
      }
      const localTime = localTimeIn(checkedInAt, site.timezone ?? "Africa/Windhoek");
      if (afterHoursTriggered({ zoneTierSortOrder: tier, localTime, config: afterHours })) {
        await this.raise({
          organisationId: visit.organisationId,
          siteId: visit.siteId,
          ruleCode: "after_hours_restricted_zone",
          visitId: visit.id,
          subjectReference: visit.id,
          dedupeSince: null,
          payload: {
            localTime,
            zoneRiskTier: tierCode,
            visitorHours: `${afterHours.windowStartLocal}-${afterHours.windowEndLocal}`,
          },
        });
      }
    }
  }

  private async raise(input: {
    organisationId: string;
    siteId: string;
    ruleCode: AnomalyRuleCode;
    visitId: string;
    subjectReference: string;
    dedupeSince: Date | null;
    payload: Record<string, string | number | null>;
  }) {
    const ruleId = await this.typeDefs.id("anomaly_rule_code", input.ruleCode);
    // One alert per subject per window: a fourth and fifth check-in inside
    // the same window do not raise new alerts.
    const existing = await this.db.query.anomalyAlertEvents.findFirst({
      where: and(
        eq(anomalyAlertEvents.organisationId, input.organisationId),
        eq(anomalyAlertEvents.siteId, input.siteId),
        eq(anomalyAlertEvents.ruleCode, ruleId),
        eq(anomalyAlertEvents.subjectReference, input.subjectReference),
        ...(input.dedupeSince ? [gte(anomalyAlertEvents.occurredAt, input.dedupeSince)] : []),
      ),
    });
    if (existing) return;
    await this.db.insert(anomalyAlertEvents).values({
      id: randomUUID(),
      organisationId: input.organisationId,
      siteId: input.siteId,
      ruleCode: ruleId,
      visitId: input.visitId,
      subjectReference: input.subjectReference,
      payloadJsonb: input.payload,
    });
    this.logger.warn(`Anomaly ${input.ruleCode} at site ${input.siteId} (visit ${input.visitId})`);
  }

  private async assertSite(user: AuthenticatedUser, siteId: string) {
    if (user.siteId && user.siteId !== siteId) throw new ForbiddenException("Site outside your scope");
    const site = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.organisationId, user.organisationId), isNull(sites.deletedAt)),
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }

  /**
   * Alerts for the user's organisation (narrowed to their site when
   * site-scoped), newest first, each with its current review state: the
   * latest status event, or "open" when there is none.
   */
  async listAlerts(user: AuthenticatedUser, input: { siteId?: string; days?: number; state?: string }) {
    const days = Math.min(Math.max(input.days ?? 7, 1), 90);
    const siteId = user.siteId ?? input.siteId;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.db.execute(sql`
      SELECT a.id, a.site_id AS "siteId", s.name AS "siteName", r.code AS "ruleCode", r.label AS "ruleLabel",
             a.visit_id AS "visitId", a.payload_jsonb AS payload, a.occurred_at AS "occurredAt",
             COALESCE(st.code, 'open') AS state, latest.occurred_at AS "reviewedAt"
        FROM anomaly_alert_events a
        JOIN sites s ON s.id = a.site_id
        JOIN type_definition r ON r.id = a.rule_code
        LEFT JOIN LATERAL (
          SELECT e.to_status_code, e.occurred_at
            FROM anomaly_alert_status_events e
           WHERE e.organisation_id = a.organisation_id AND e.alert_id = a.id
           ORDER BY e.occurred_at DESC
           LIMIT 1
        ) latest ON TRUE
        LEFT JOIN type_definition st ON st.id = latest.to_status_code
       WHERE a.organisation_id = ${user.organisationId}
         AND a.occurred_at >= ${since}
         ${siteId ? sql`AND a.site_id = ${siteId}` : sql``}
       ORDER BY a.occurred_at DESC
       LIMIT 500
    `);
    type Row = {
      id: string;
      siteId: string;
      siteName: string;
      ruleCode: string;
      ruleLabel: string;
      visitId: string | null;
      payload: Record<string, string | number | null> | null;
      occurredAt: string;
      state: string;
      reviewedAt: string | null;
    };
    // "reopened" is open again.
    const rows = (result.rows as Row[]).map((r) => ({ ...r, state: r.state === "reopened" ? "open" : r.state }));
    const alerts = input.state && input.state !== "all" ? rows.filter((r) => r.state === input.state) : rows;
    return { days, openCount: rows.filter((r) => r.state === "open").length, alerts };
  }

  /** Acknowledge, dismiss or reopen an alert: one append-only row per review. */
  async reviewAlert(user: AuthenticatedUser, alertId: string, status: string, note?: string) {
    if (!["acknowledged", "dismissed", "reopened"].includes(status)) {
      throw new BadRequestException("Status must be acknowledged, dismissed or reopened");
    }
    const alert = await this.db.query.anomalyAlertEvents.findFirst({
      where: and(eq(anomalyAlertEvents.id, alertId), eq(anomalyAlertEvents.organisationId, user.organisationId)),
    });
    if (!alert) throw new NotFoundException("Alert not found");
    if (user.siteId && user.siteId !== alert.siteId) throw new ForbiddenException("Alert outside your site");
    await this.db.insert(anomalyAlertStatusEvents).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      alertId,
      toStatusCode: await this.typeDefs.id("anomaly_alert_status", status),
      actorId: user.userId,
      note: note?.trim().slice(0, 500) || null,
    });
    return { id: alertId, state: status === "reopened" ? "open" : status };
  }

  async getRules(user: AuthenticatedUser, siteId: string) {
    await this.assertSite(user, siteId);
    const labels = await this.db
      .select({ code: typeDefinition.code, label: typeDefinition.label })
      .from(typeDefinition)
      .where(and(eq(typeDefinition.domain, "anomaly_rule_code"), inArray(typeDefinition.code, ANOMALY_RULE_CODES)));
    const configs = await this.effectiveConfigs(user.organisationId, siteId);
    return configs.map((c) => ({ ...c, label: labels.find((l) => l.code === c.ruleCode)?.label ?? c.ruleCode }));
  }

  async updateRule(user: AuthenticatedUser, siteId: string, ruleCode: string, input: UpdateAnomalyRuleInput) {
    if (!ANOMALY_RULE_CODES.includes(ruleCode as AnomalyRuleCode)) throw new BadRequestException("Unknown rule");
    await this.assertSite(user, siteId);
    if (!Number.isInteger(input.thresholdInt) || input.thresholdInt < 1 || input.thresholdInt > 100) {
      throw new BadRequestException("Threshold must be a whole number from 1 to 100");
    }
    const code = ruleCode as AnomalyRuleCode;
    let windowMinutes: number | null = null;
    let windowStartLocal: string | null = null;
    let windowEndLocal: string | null = null;
    if (code === "repeat_phone_window") {
      windowMinutes = input.windowMinutes ?? 30;
      if (!Number.isInteger(windowMinutes) || windowMinutes < 5 || windowMinutes > 1440) {
        throw new BadRequestException("Window must be from 5 to 1440 minutes");
      }
    } else {
      windowStartLocal = input.windowStartLocal ?? "07:00";
      windowEndLocal = input.windowEndLocal ?? "18:00";
      if (!HHMM.test(windowStartLocal) || !HHMM.test(windowEndLocal)) {
        throw new BadRequestException("Visitor hours must be HH:mm");
      }
    }
    const ruleId = await this.typeDefs.id("anomaly_rule_code", code);
    const values = {
      enabled: input.enabled,
      thresholdInt: input.thresholdInt,
      windowMinutes,
      windowStartLocal,
      windowEndLocal,
      updatedAt: new Date(),
      updatedBy: user.userId,
    };
    const existing = await this.db.query.siteAnomalyRuleConfigurations.findFirst({
      where: and(
        eq(siteAnomalyRuleConfigurations.organisationId, user.organisationId),
        eq(siteAnomalyRuleConfigurations.siteId, siteId),
        eq(siteAnomalyRuleConfigurations.ruleCode, ruleId),
        isNull(siteAnomalyRuleConfigurations.deletedAt),
      ),
    });
    if (existing) {
      await this.db
        .update(siteAnomalyRuleConfigurations)
        .set(values)
        .where(eq(siteAnomalyRuleConfigurations.id, existing.id));
    } else {
      await this.db.insert(siteAnomalyRuleConfigurations).values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId,
        ruleCode: ruleId,
        ...values,
      });
    }
    return this.getRules(user, siteId);
  }

  /** Platform-wide count for the ops integration health panel (no tenant detail). */
  async countSince(since: Date): Promise<number> {
    const result = await this.db.execute(
      sql`SELECT count(*)::int AS n FROM anomaly_alert_events WHERE occurred_at >= ${since}`,
    );
    return Number((result.rows[0] as { n: number }).n);
  }
}
