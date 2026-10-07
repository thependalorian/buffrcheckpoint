import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { HostsService } from "../hosts/hosts.service";
import { OnboardingStateService } from "../onboarding-state/onboarding-state.service";
import type { EffectiveCheckInForm } from "../visitor-policy/visitor-policy.service";
import { VisitorPolicyService } from "../visitor-policy/visitor-policy.service";
import { TEST_VISIT_CHANNEL_CODE } from "../visits/test-visit-filter";
import { VisitsService } from "../visits/visits.service";

const TEST_VISITOR_NAME = "Onboarding test visitor";
const TEST_VISITOR_TYPE = "general";
const PLACEHOLDER_ANSWER = "Onboarding test";

/** Answers for every required field so a published form does not block the rehearsal. */
export function placeholderAnswers(form: EffectiveCheckInForm | null) {
  if (!form) return undefined;
  return form.fields
    .filter((field) => field.required)
    .map((field) => {
      const schema = field.validationSchema as { options?: unknown; maxLength?: unknown };
      const options = Array.isArray(schema.options) ? schema.options.filter((o) => typeof o === "string") : [];
      const maxLength = typeof schema.maxLength === "number" ? schema.maxLength : undefined;
      const value = options[0] ?? PLACEHOLDER_ANSWER.slice(0, maxLength);
      return {
        formVersionId: form.formVersionId,
        fieldCode: field.fieldCode,
        answerValue: { value },
        fieldLabelSnapshot: field.fieldLabel,
      };
    });
}

export interface TestVisitSummary {
  visitId: string;
  siteId: string;
  siteName: string;
  hostId: string;
  hostName: string;
  checkedIn: boolean;
}

/**
 * Test arrival (buffrcheckpoint.md §7.8): one real visit through the
 * normal check-in path, so the host notification and roster are exercised.
 * It stays open until the owner checks it out, so it is genuinely visible on
 * the Front Desk roster. The onboarding_test channel keeps it out of
 * analytics, anomaly rules, reports and billing counts.
 */
@Injectable()
export class OnboardingTestVisitService {
  private readonly logger = new Logger(OnboardingTestVisitService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly visits: VisitsService,
    private readonly visitorPolicy: VisitorPolicyService,
    private readonly onboardingState: OnboardingStateService,
    private readonly hosts: HostsService,
  ) {}

  /** Where the test visit will land, shown before the owner creates it. */
  async preview(user: AuthenticatedUser) {
    const target = await this.firstSiteAndHost(user.organisationId);
    return {
      siteId: target.siteId,
      siteName: target.siteName,
      hostId: target.hostId,
      hostName: await this.hostName(target, user),
    };
  }

  /** The most recent test visit, open or closed, or null when none exists yet. */
  async latest(user: AuthenticatedUser): Promise<TestVisitSummary | null> {
    return this.find(user, null);
  }

  async create(visitId: string, user: AuthenticatedUser): Promise<TestVisitSummary> {
    // A retried request with the same client id returns the visit it already made.
    const existing = await this.find(user, visitId);
    if (existing) return existing;

    const target = await this.firstSiteAndHost(user.organisationId);
    const form = await this.visitorPolicy.resolveEffectiveForm(user.organisationId, target.siteId, TEST_VISITOR_TYPE);

    const visit = await this.visits.checkIn(
      {
        id: visitId,
        siteId: target.siteId,
        hostId: target.hostId,
        visitorName: TEST_VISITOR_NAME,
        visitorTypeCode: TEST_VISITOR_TYPE,
        captureChannelCode: TEST_VISIT_CHANNEL_CODE,
        checkedInAt: new Date().toISOString(),
        formAnswers: placeholderAnswers(form),
      },
      user,
    );
    this.onboardingState.notifyChanged(user.organisationId);
    this.logger.log(`onboarding test visit ${visit.id} org=${user.organisationId}`);
    return {
      visitId: visit.id,
      siteId: target.siteId,
      siteName: target.siteName,
      hostId: target.hostId,
      hostName: await this.hostName(target, user),
      checkedIn: true,
    };
  }

  private async find(user: AuthenticatedUser, visitId: string | null): Promise<TestVisitSummary | null> {
    const result = await this.db.execute(sql`
      SELECT v.id, v.site_id, s.name AS site_name, v.host_id, v.checked_out_at
      FROM visitor_visits v
      JOIN sites s ON s.id = v.site_id
      JOIN type_definition ch ON ch.id = v.arrival_channel_code
        AND ch.domain = 'capture_channel' AND ch.code = ${TEST_VISIT_CHANNEL_CODE}
      WHERE v.organisation_id = ${user.organisationId} AND v.deleted_at IS NULL
        AND (${visitId}::uuid IS NULL OR v.id = ${visitId}::uuid)
      ORDER BY v.checked_in_at DESC
      LIMIT 1
    `);
    const row = result.rows[0] as
      | { id: string; site_id: string; site_name: string; host_id: string; checked_out_at: unknown }
      | undefined;
    if (!row) return null;
    const target = { siteId: row.site_id, siteName: row.site_name, hostId: row.host_id };
    return {
      visitId: row.id,
      ...target,
      hostName: await this.hostName(target, user),
      checkedIn: row.checked_out_at === null,
    };
  }

  private async hostName(target: { siteId: string; hostId: string }, user: AuthenticatedUser): Promise<string> {
    const hosts = await this.hosts.listBySite(target.siteId, user);
    return hosts.find((host) => host.id === target.hostId)?.displayName ?? "Host";
  }

  private async firstSiteAndHost(organisationId: string) {
    const result = await this.db.execute(sql`
      SELECT h.id AS host_id, h.site_id, s.name AS site_name
      FROM site_hosts h
      JOIN sites s ON s.id = h.site_id AND s.deleted_at IS NULL
      WHERE h.organisation_id = ${organisationId} AND h.deleted_at IS NULL AND h.active
      ORDER BY s.name, h.id
      LIMIT 1
    `);
    const row = result.rows[0] as { host_id: string; site_id: string; site_name: string } | undefined;
    if (!row) {
      throw new BadRequestException({
        code: "ONBOARDING_TEST_VISIT_NEEDS_HOST",
        message: "Add a site and at least one active host before creating a test visit.",
      });
    }
    return { siteId: row.site_id, siteName: row.site_name, hostId: row.host_id };
  }
}
