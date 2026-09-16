import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  accessPolicy,
  checkInFormDefinitions,
  checkInFormFields,
  checkInFormVersions,
  evidencePack,
  kioskExperienceConfigurations,
  managedKioskDevices,
  organisationMemberships,
  organisations,
  retentionPolicies,
  siteBrandingProfiles,
  siteHosts,
  siteQrReferences,
  sites,
  visitorPolicyVersions,
  visitorVisits,
  visitorPolicyDocuments,
} from "../../db/schema";
import type { OnboardingStepCode } from "../onboarding/onboarding-steps";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

@Injectable()
export class OnboardingEvidenceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async evaluate(user: AuthenticatedUser, stepCode: OnboardingStepCode): Promise<string[]> {
    const orgId = user.organisationId;
    const missing: string[] = [];

    switch (stepCode) {
      case "organisation_profile": {
        const org = await this.db.query.organisations.findFirst({
          where: and(eq(organisations.id, orgId), isNull(organisations.deletedAt)),
        });
        if (!org?.legalName?.trim()) missing.push("organisation.legal_name");
        break;
      }
      case "branding": {
        const rows = await this.db.query.siteBrandingProfiles.findMany({
          where: and(eq(siteBrandingProfiles.organisationId, orgId), isNull(siteBrandingProfiles.deletedAt)),
        });
        if (rows.length === 0) missing.push("site_branding.profile");
        break;
      }
      case "site_hierarchy": {
        const rows = await this.db.query.sites.findMany({
          where: and(eq(sites.organisationId, orgId), isNull(sites.deletedAt)),
        });
        if (rows.length === 0) missing.push("sites.at_least_one");
        break;
      }
      case "hosts_departments": {
        const rows = await this.db.query.siteHosts.findMany({
          where: and(eq(siteHosts.organisationId, orgId), isNull(siteHosts.deletedAt)),
        });
        if (rows.length === 0) missing.push("hosts.at_least_one");
        break;
      }
      case "visitor_categories": {
        const forms = await this.db.query.checkInFormDefinitions.findMany({
          where: and(eq(checkInFormDefinitions.organisationId, orgId), isNull(checkInFormDefinitions.deletedAt)),
        });
        if (forms.length === 0) {
          missing.push("forms.definition");
          break;
        }
        let hasPublishedField = false;
        for (const form of forms) {
          const versions = await this.db.query.checkInFormVersions.findMany({
            where: and(eq(checkInFormVersions.formDefinitionId, form.id), isNull(checkInFormVersions.deletedAt)),
          });
          for (const version of versions) {
            const fields = await this.db.query.checkInFormFields.findMany({
              where: and(eq(checkInFormFields.formVersionId, version.id), isNull(checkInFormFields.deletedAt)),
            });
            if (fields.length > 0) {
              hasPublishedField = true;
              break;
            }
          }
          if (hasPublishedField) break;
        }
        if (!hasPublishedField) missing.push("forms.version_with_fields");
        break;
      }
      case "check_in_channels": {
        const qrs = await this.db.query.siteQrReferences.findMany({
          where: and(eq(siteQrReferences.organisationId, orgId), isNull(siteQrReferences.deletedAt)),
        });
        if (qrs.length === 0) missing.push("site_qr.active");
        const kiosk = await this.db.query.kioskExperienceConfigurations.findMany({
          where: and(
            eq(kioskExperienceConfigurations.organisationId, orgId),
            isNull(kioskExperienceConfigurations.deletedAt),
          ),
        });
        if (kiosk.length === 0) missing.push("kiosk_experience.config");
        break;
      }
      case "risk_identity_approval": {
        const rows = await this.db.query.accessPolicy.findMany({
          where: and(eq(accessPolicy.organisationId, orgId), isNull(accessPolicy.deletedAt)),
        });
        if (rows.length === 0) missing.push("access_policy.at_least_one");
        break;
      }
      case "notices_retention": {
        const docs = await this.db.query.visitorPolicyDocuments.findMany({
          where: and(eq(visitorPolicyDocuments.organisationId, orgId), isNull(visitorPolicyDocuments.deletedAt)),
        });
        if (docs.length === 0) missing.push("privacy_policy.document");
        else {
          let hasVersion = false;
          for (const doc of docs) {
            const versions = await this.db.query.visitorPolicyVersions.findMany({
              where: and(eq(visitorPolicyVersions.policyDocumentId, doc.id), isNull(visitorPolicyVersions.deletedAt)),
            });
            if (versions.length > 0) {
              hasVersion = true;
              break;
            }
          }
          if (!hasVersion) missing.push("privacy_policy.version");
        }
        const retention = await this.db.query.retentionPolicies.findMany({
          where: and(eq(retentionPolicies.organisationId, orgId), isNull(retentionPolicies.deletedAt)),
        });
        if (retention.length === 0) missing.push("retention_policy.at_least_one");
        break;
      }
      case "devices_mdm": {
        const devices = await this.db.query.managedKioskDevices.findMany({
          where: and(eq(managedKioskDevices.organisationId, orgId), isNull(managedKioskDevices.deletedAt)),
        });
        if (devices.length === 0) missing.push("devices.at_least_one");
        break;
      }
      case "cran_evidence": {
        const packs = await this.db.query.evidencePack.findMany({
          where: and(eq(evidencePack.organisationId, orgId), isNull(evidencePack.deletedAt)),
        });
        if (packs.length === 0) missing.push("evidence_pack.at_least_one");
        break;
      }
      case "flow_tests": {
        const visits = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(visitorVisits)
          .where(and(eq(visitorVisits.organisationId, orgId), isNull(visitorVisits.deletedAt)));
        if ((visits[0]?.count ?? 0) < 1) missing.push("visits.at_least_one_test");
        break;
      }
      case "role_training": {
        const memberships = await this.db.query.organisationMemberships.findMany({
          where: and(
            eq(organisationMemberships.organisationId, orgId),
            eq(organisationMemberships.userId, user.userId),
            isNull(organisationMemberships.deletedAt),
          ),
        });
        if (memberships.length === 0) missing.push("rbac.membership");
        break;
      }
      case "golive_approval":
        // Checked separately against completedStepCodes in auth.service
        break;
      default:
        break;
    }

    return missing;
  }

  async assertSatisfied(user: AuthenticatedUser, stepCode: OnboardingStepCode) {
    const missingEvidence = await this.evaluate(user, stepCode);
    if (missingEvidence.length > 0) {
      throw new BadRequestException({
        message: "Onboarding evidence incomplete",
        missingEvidence,
      });
    }
  }
}
