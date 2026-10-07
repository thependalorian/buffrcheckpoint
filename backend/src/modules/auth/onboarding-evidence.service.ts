import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { type LaunchRoute, type OnboardingStepCode, STEP_PREREQUISITES } from "../onboarding/onboarding-steps";

/** Facts the checklist depends on, read in one statement. */
export interface EvidenceSnapshot {
  legalName: boolean;
  site: boolean;
  host: boolean;
  launchRoute: boolean;
  privacyNoticePublished: boolean;
  retentionPolicy: boolean;
  formWithFields: boolean;
  siteQr: boolean;
  kioskConfig: boolean;
  accessPolicy: boolean;
  device: boolean;
  testVisit: boolean;
  trainingAcknowledged: boolean;
  evidencePack: boolean;
}

/**
 * Missing evidence keys for a step on a route. Each key has user-facing
 * copy in admin `lib/copy/onboarding.ts` (`blockerCopy`).
 */
export function missingEvidence(
  step: OnboardingStepCode,
  route: LaunchRoute | null,
  facts: EvidenceSnapshot,
): string[] {
  const missing: string[] = [];
  const need = (ok: boolean, key: string) => {
    if (!ok) missing.push(key);
  };
  switch (step) {
    case "organisation_profile":
      need(facts.legalName, "organisation.legal_name");
      break;
    case "site_hierarchy":
      need(facts.site, "sites.at_least_one");
      break;
    case "hosts_departments":
      need(facts.host, "hosts.at_least_one");
      break;
    case "launch_route":
      need(facts.launchRoute, "launch_route.chosen");
      break;
    case "notices_retention":
      need(facts.privacyNoticePublished, "privacy_policy.published_version");
      need(facts.retentionPolicy, "retention_policy.at_least_one");
      break;
    case "visitor_categories":
      need(facts.formWithFields, "forms.version_with_fields");
      break;
    case "check_in_channels":
      need(facts.siteQr, "site_qr.active");
      if (route === "kiosk") need(facts.kioskConfig, "kiosk_experience.config");
      break;
    case "risk_identity_approval":
      need(facts.accessPolicy, "access_policy.at_least_one");
      break;
    case "devices_mdm":
      need(facts.device, "devices.at_least_one");
      break;
    case "flow_tests":
      need(facts.testVisit, "visits.test_visit");
      break;
    case "role_training":
      need(facts.trainingAcknowledged, "training.acknowledged");
      break;
    case "cran_evidence":
      need(facts.evidencePack, "evidence_pack.at_least_one");
      break;
    case "golive_approval":
      // Go-live checks the other required steps, not evidence of its own.
      break;
  }
  return missing;
}

const PREREQUISITE_FACTS: Readonly<Record<string, keyof EvidenceSnapshot>> = {
  "sites.at_least_one": "site",
  "hosts.at_least_one": "host",
};

/** Prerequisite evidence keys still missing before a step can start; [] when it is unblocked. */
export function blockedBy(step: OnboardingStepCode, facts: EvidenceSnapshot): string[] {
  return (STEP_PREREQUISITES[step] ?? []).filter((key) => !facts[PREREQUISITE_FACTS[key]]);
}

@Injectable()
export class OnboardingEvidenceService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async snapshot(organisationId: string, userId: string): Promise<EvidenceSnapshot> {
    const result = await this.db.execute(sql`
      SELECT
        EXISTS (SELECT 1 FROM organisations o
                WHERE o.id = ${organisationId} AND o.deleted_at IS NULL AND btrim(coalesce(o.legal_name, '')) <> '') AS legal_name,
        EXISTS (SELECT 1 FROM sites s WHERE s.organisation_id = ${organisationId} AND s.deleted_at IS NULL) AS site,
        EXISTS (SELECT 1 FROM site_hosts h WHERE h.organisation_id = ${organisationId} AND h.deleted_at IS NULL) AS host,
        EXISTS (SELECT 1 FROM organisation_onboarding_states st
                WHERE st.organisation_id = ${organisationId} AND st.deleted_at IS NULL AND st.launch_route_code IS NOT NULL) AS launch_route,
        EXISTS (SELECT 1 FROM visitor_policy_documents d
                JOIN visitor_policy_versions v ON v.policy_document_id = d.id AND v.deleted_at IS NULL
                JOIN type_definition vs ON vs.id = v.status_code AND vs.domain = 'policy_version_status' AND vs.code = 'published'
                WHERE d.organisation_id = ${organisationId} AND d.deleted_at IS NULL) AS privacy_notice_published,
        EXISTS (SELECT 1 FROM retention_policies r WHERE r.organisation_id = ${organisationId} AND r.deleted_at IS NULL) AS retention_policy,
        EXISTS (SELECT 1 FROM check_in_form_definitions f
                JOIN check_in_form_versions fv ON fv.form_definition_id = f.id AND fv.deleted_at IS NULL
                JOIN check_in_form_fields ff ON ff.form_version_id = fv.id AND ff.deleted_at IS NULL
                WHERE f.organisation_id = ${organisationId} AND f.deleted_at IS NULL) AS form_with_fields,
        EXISTS (SELECT 1 FROM site_qr_references q WHERE q.organisation_id = ${organisationId} AND q.deleted_at IS NULL) AS site_qr,
        EXISTS (SELECT 1 FROM kiosk_experience_configurations k
                WHERE k.organisation_id = ${organisationId} AND k.deleted_at IS NULL) AS kiosk_config,
        EXISTS (SELECT 1 FROM access_policy a WHERE a.organisation_id = ${organisationId} AND a.deleted_at IS NULL) AS access_policy,
        EXISTS (SELECT 1 FROM managed_kiosk_devices md WHERE md.organisation_id = ${organisationId} AND md.deleted_at IS NULL) AS device,
        EXISTS (SELECT 1 FROM visitor_visits vv
                WHERE vv.organisation_id = ${organisationId} AND vv.deleted_at IS NULL) AS test_visit,
        EXISTS (SELECT 1 FROM staff_training_acknowledgements ta
                WHERE ta.organisation_id = ${organisationId} AND ta.user_id = ${userId} AND ta.deleted_at IS NULL) AS training_acknowledged,
        EXISTS (SELECT 1 FROM evidence_pack e WHERE e.organisation_id = ${organisationId} AND e.deleted_at IS NULL) AS evidence_pack
    `);
    const row = (result.rows[0] ?? {}) as Record<string, unknown>;
    const flag = (key: string) => row[key] === true;
    return {
      legalName: flag("legal_name"),
      site: flag("site"),
      host: flag("host"),
      launchRoute: flag("launch_route"),
      privacyNoticePublished: flag("privacy_notice_published"),
      retentionPolicy: flag("retention_policy"),
      formWithFields: flag("form_with_fields"),
      siteQr: flag("site_qr"),
      kioskConfig: flag("kiosk_config"),
      accessPolicy: flag("access_policy"),
      device: flag("device"),
      testVisit: flag("test_visit"),
      trainingAcknowledged: flag("training_acknowledged"),
      evidencePack: flag("evidence_pack"),
    };
  }

  /** Fails closed when a step's prerequisites are missing (a blocked step never accepts writes). */
  async assertUnblocked(organisationId: string, userId: string, step: OnboardingStepCode): Promise<void> {
    const missing = blockedBy(step, await this.snapshot(organisationId, userId));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: "ONBOARDING_STEP_BLOCKED",
        message: "Finish the earlier setup this step depends on first.",
        missingEvidence: missing,
      });
    }
  }

  async assertSatisfied(
    organisationId: string,
    userId: string,
    step: OnboardingStepCode,
    route: LaunchRoute | null,
  ): Promise<void> {
    const missing = missingEvidence(step, route, await this.snapshot(organisationId, userId));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: "ONBOARDING_EVIDENCE_MISSING",
        message: "Onboarding evidence incomplete",
        missingEvidence: missing,
      });
    }
  }
}
