import { Inject, Injectable, Logger } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { HostsService } from "../hosts/hosts.service";
import { OnboardingStateService } from "../onboarding-state/onboarding-state.service";
import { OrganisationStandardsService } from "../organisation-standards/organisation-standards.service";
import {
  PRIVACY_NOTICE_LANGUAGE,
  PRIVACY_NOTICE_NAME,
  PRIVACY_NOTICE_POLICY_CODE,
  STANDARD_FORM_FIELDS,
  STANDARD_FORM_NAME,
  STANDARD_HOST_DEPARTMENT,
  STANDARD_HOST_NAME,
  STANDARD_QR_LABEL,
  STANDARD_SITE_NAME,
  STANDARD_VISITOR_TYPE,
  standardPrivacyNotice,
} from "../organisation-standards/standard-defaults";
import { RetentionPolicyService } from "../retention-policy/retention-policy.service";
import { SiteQrReferencesService } from "../site-qr-references/site-qr-references.service";
import { SitesService } from "../sites/sites.service";
import { VisitorPolicyService } from "../visitor-policy/visitor-policy.service";

export type DefaultItem = "site" | "host" | "retention" | "privacy_notice" | "check_in_form" | "site_qr";

export interface DefaultsResult {
  /** What this run created. Empty when the organisation already had everything. */
  created: DefaultItem[];
}

/**
 * Gives a new organisation a working setup the moment it opens setup, so nothing has to be typed before the first check-in: a first
 * site, a first host (the owner's own address, so arrival alerts reach them), Checkpoint's standard check-in form, the public QR,
 * the standard visitor privacy notice and the standard retention period. See organisation-standards/standard-defaults.ts for where
 * each standard comes from.
 *
 * It only ever fills gaps: anything the organisation already has, in any form, is left exactly as it is. It uses the same services
 * as the screens, so a default is indistinguishable from something the owner created, and the owner can edit all of it. It is safe
 * to run again and again, and two simultaneous runs for one organisation share one execution.
 */
@Injectable()
export class OrganisationDefaultsService {
  private readonly logger = new Logger(OrganisationDefaultsService.name);
  private readonly inflight = new Map<string, Promise<DefaultsResult>>();

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly sites: SitesService,
    private readonly hosts: HostsService,
    private readonly retention: RetentionPolicyService,
    private readonly policy: VisitorPolicyService,
    private readonly qr: SiteQrReferencesService,
    private readonly standards: OrganisationStandardsService,
    private readonly onboardingState: OnboardingStateService,
  ) {}

  ensure(user: AuthenticatedUser): Promise<DefaultsResult> {
    const running = this.inflight.get(user.organisationId);
    if (running) return running;
    const run = this.run(user).finally(() => this.inflight.delete(user.organisationId));
    this.inflight.set(user.organisationId, run);
    return run;
  }

  private async ownerContact(user: AuthenticatedUser): Promise<{ email: string | null; organisationName: string }> {
    const result = await this.db.execute(sql`
      SELECT u.email, coalesce(nullif(btrim(o.trading_name), ''), o.legal_name) AS organisation_name
      FROM application_users u JOIN organisations o ON o.id = u.organisation_id
      WHERE u.id = ${user.userId} AND u.deleted_at IS NULL LIMIT 1`);
    const row = result.rows[0] as { email?: string; organisation_name?: string } | undefined;
    return { email: row?.email ?? null, organisationName: row?.organisation_name ?? "" };
  }

  private async run(user: AuthenticatedUser): Promise<DefaultsResult> {
    const created: DefaultItem[] = [];
    const owner = await this.ownerContact(user);

    // 1. A first site.
    let siteList = await this.sites.list(user);
    if (siteList.length === 0) {
      siteList = [await this.sites.create({ name: STANDARD_SITE_NAME }, user)];
      created.push("site");
    }
    const siteId = siteList[0].id;

    // 2. A first host. The owner's address is the contact, so "your visitor has arrived" reaches a real person.
    const hostList = await this.hosts.listBySite(undefined, user);
    if (hostList.length === 0) {
      await this.hosts.create(
        {
          siteId,
          name: STANDARD_HOST_NAME,
          department: STANDARD_HOST_DEPARTMENT,
          contactReference: owner.email ?? undefined,
        },
        user,
      );
      created.push("host");
    }

    // 3. The standard retention period, as the organisation default.
    const retentionRows = await this.retention.list(user);
    const retentionDays = await this.standards.standardRetentionDays();
    if (retentionRows.length === 0) {
      await this.retention.create({ retentionDays }, user);
      created.push("retention");
    }
    // The notice states the period actually in force, so read it back rather than assume the standard.
    const effectiveDays = retentionRows[0]?.retentionDays ?? retentionDays;

    // 4. The standard visitor privacy notice, published. Only when the organisation has no privacy notice document of any state.
    const documents = await this.policy.listPolicyDocuments(user);
    if (!documents.some((doc) => doc.policyCode === PRIVACY_NOTICE_POLICY_CODE)) {
      const document = await this.policy.createPolicyDocument(
        {
          policyCode: PRIVACY_NOTICE_POLICY_CODE,
          policyName: PRIVACY_NOTICE_NAME,
          category: PRIVACY_NOTICE_POLICY_CODE,
        },
        user,
      );
      const version = await this.policy.createPolicyVersion(
        document.id,
        {
          contentText: standardPrivacyNotice({
            organisationName: owner.organisationName,
            retentionDays: effectiveDays,
          }),
          languageCode: PRIVACY_NOTICE_LANGUAGE,
        },
        user,
      );
      await this.policy.publishPolicyVersion(version.id, user);
      created.push("privacy_notice");
    }

    // 5. The standard check-in form, published. Only when the organisation has no form at all.
    const forms = await this.policy.list(user);
    if (forms.length === 0) {
      const definition = await this.policy.create(
        { visitorCategoryCode: STANDARD_VISITOR_TYPE, formName: STANDARD_FORM_NAME },
        user,
      );
      const version = await this.policy.createFormVersion(definition.id, user);
      for (const field of STANDARD_FORM_FIELDS) {
        await this.policy.addFormField(
          version.id,
          {
            fieldCode: field.fieldCode,
            fieldLabel: field.fieldLabel,
            fieldTypeCode: field.fieldTypeCode,
            helpText: field.helpText,
            dataClassificationCode: field.dataClassificationCode,
            required: field.required,
            displayOrder: field.displayOrder,
            visibilityRule: field.visibilityRule,
            validationSchema: field.validationSchema,
          },
          user,
        );
      }
      await this.policy.publishFormVersion(version.id, user);
      created.push("check_in_form");
    }

    // 6. The public QR for the first site.
    const references = await this.qr.list(user);
    if (!references.some((ref) => ref.qrTypeCode === "public_site_checkin")) {
      await this.qr.create({ siteId, qrTypeCode: "public_site_checkin", label: STANDARD_QR_LABEL }, user);
      created.push("site_qr");
    }

    if (created.length > 0) {
      this.onboardingState.notifyChanged(user.organisationId);
      this.logger.log(`onboarding_defaults org=${user.organisationId} created=${created.join(",")}`);
    }
    return { created };
  }
}
