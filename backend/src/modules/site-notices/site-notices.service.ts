import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  sites,
  visitorPolicyAcknowledgements,
  visitorPolicyDocuments,
  visitorPolicyVersions,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { SiteQrReferencesService } from "../site-qr-references/site-qr-references.service";
import { VisitorPolicyService } from "../visitor-policy/visitor-policy.service";
import { VisitsService } from "../visits/visits.service";
import {
  inductionRefusal,
  NOTICE_KINDS,
  type NoticeKind,
  NoticeRuleError,
  normaliseNoticeText,
  policyCodesFor,
} from "./site-notices";
import { randomUUID } from "node:crypto";

export interface PublishedNotice {
  versionId: string;
  documentId: string;
  policyCode: string;
  versionNumber: number;
  contentText: string;
  languageCode: string | null;
  publishedAt: string;
  /** True when this site has its own text, false when the organisation-wide text is shown. */
  siteSpecific: boolean;
}

@Injectable()
export class SiteNoticesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly policies: VisitorPolicyService,
    private readonly qr: SiteQrReferencesService,
    private readonly visits: VisitsService,
  ) {}

  /** The published text for a site: its own if it has one, otherwise the organisation-wide text, otherwise null. */
  async resolvePublished(
    organisationId: string,
    kind: NoticeKind,
    siteId: string | null,
  ): Promise<PublishedNotice | null> {
    const publishedStatus = await this.typeDefs.id("policy_version_status", "published");
    for (const policyCode of policyCodesFor(kind, siteId)) {
      const [row] = await this.db
        .select({
          versionId: visitorPolicyVersions.id,
          documentId: visitorPolicyDocuments.id,
          versionNumber: visitorPolicyVersions.versionNumber,
          contentArtifactId: visitorPolicyVersions.contentArtifactId,
          languageId: visitorPolicyVersions.languageCode,
          effectiveFrom: visitorPolicyVersions.effectiveFrom,
        })
        .from(visitorPolicyVersions)
        .innerJoin(visitorPolicyDocuments, eq(visitorPolicyVersions.policyDocumentId, visitorPolicyDocuments.id))
        .where(
          and(
            eq(visitorPolicyDocuments.organisationId, organisationId),
            eq(visitorPolicyDocuments.policyCode, policyCode),
            isNull(visitorPolicyDocuments.deletedAt),
            isNull(visitorPolicyVersions.deletedAt),
            eq(visitorPolicyVersions.statusCode, publishedStatus),
          ),
        )
        .orderBy(desc(visitorPolicyVersions.versionNumber))
        .limit(1);
      if (!row?.contentArtifactId?.startsWith("inline:")) continue;
      return {
        versionId: row.versionId,
        documentId: row.documentId,
        policyCode,
        versionNumber: row.versionNumber,
        contentText: row.contentArtifactId.slice("inline:".length),
        languageCode: (await this.typeDefs.codeById(row.languageId)) ?? null,
        publishedAt: row.effectiveFrom.toISOString(),
        siteSpecific: policyCode.includes(":"),
      };
    }
    return null;
  }

  // ---- staff ---------------------------------------------------------------------------------------------------------------

  async getForStaff(kind: NoticeKind, siteId: string | undefined, user: AuthenticatedUser) {
    if (siteId) await this.requireSite(siteId, user.organisationId);
    return {
      kind,
      title: NOTICE_KINDS[kind].title,
      siteId: siteId ?? null,
      published: await this.resolvePublished(user.organisationId, kind, siteId ?? null),
    };
  }

  /** Saves the text as a new version and publishes it in one step. The earlier version stays in the history as superseded. */
  async publish(
    kind: NoticeKind,
    input: { siteId?: string; contentText: string; languageCode?: string },
    user: AuthenticatedUser,
  ) {
    let text: string;
    try {
      text = normaliseNoticeText(input.contentText);
    } catch (error) {
      if (error instanceof NoticeRuleError) throw new BadRequestException(error.message);
      throw error;
    }
    if (input.siteId) await this.requireSite(input.siteId, user.organisationId);

    const definition = NOTICE_KINDS[kind];
    const policyCode = input.siteId ? `${definition.policyCode}:${input.siteId}` : definition.policyCode;
    let document = await this.db.query.visitorPolicyDocuments.findFirst({
      where: and(
        eq(visitorPolicyDocuments.organisationId, user.organisationId),
        eq(visitorPolicyDocuments.policyCode, policyCode),
        isNull(visitorPolicyDocuments.deletedAt),
      ),
    });
    if (!document) {
      document = await this.policies.createPolicyDocument(
        { policyCode, policyName: definition.title, category: definition.category },
        user,
      );
    }
    const version = await this.policies.createPolicyVersion(
      document.id,
      { contentText: text, languageCode: input.languageCode ?? "en" },
      user,
    );
    await this.policies.publishPolicyVersion(version.id, user);
    const published = await this.resolvePublished(user.organisationId, kind, input.siteId ?? null);
    return published;
  }

  /** For one visit: does the induction apply, and has it been acknowledged on the version now published. */
  async inductionStatus(visitId: string, user: AuthenticatedUser) {
    const visit = await this.db.query.visitorVisits.findFirst({
      where: and(
        eq(visitorVisits.id, visitId),
        eq(visitorVisits.organisationId, user.organisationId),
        isNull(visitorVisits.deletedAt),
      ),
    });
    if (!visit) throw new NotFoundException("Visit not found");
    const typeCode = visit.visitorCategoryCode ? await this.typeDefs.codeById(visit.visitorCategoryCode) : null;
    const required = typeCode === "contractor";
    const published = required ? await this.resolvePublished(user.organisationId, "induction", visit.siteId) : null;
    const acks = required
      ? await this.db.query.visitorPolicyAcknowledgements.findMany({
          where: and(
            eq(visitorPolicyAcknowledgements.organisationId, user.organisationId),
            eq(visitorPolicyAcknowledgements.visitId, visit.id),
            isNull(visitorPolicyAcknowledgements.deletedAt),
          ),
        })
      : [];
    const versionIds = acks.map((a) => a.policyVersionId);
    const versions = versionIds.length
      ? await this.db.query.visitorPolicyVersions.findMany({ where: inArray(visitorPolicyVersions.id, versionIds) })
      : [];
    const inductionVersionIds = new Set(
      versions.filter((v) => published?.documentId === v.policyDocumentId).map((v) => v.id),
    );
    const mine = acks.find((a) => a.acceptedAt && inductionVersionIds.has(a.policyVersionId));
    return {
      visitId: visit.id,
      required,
      induction: published ? { versionNumber: published.versionNumber, publishedAt: published.publishedAt } : null,
      acknowledged: Boolean(mine),
      acknowledgedAt: mine?.acceptedAt?.toISOString() ?? null,
    };
  }

  // ---- public (reached by QR code, no sign-in) -----------------------------------------------------------------------------

  async publicEmergency(siteId: string, referenceId: string) {
    const ref = await this.qr.validatePublicReference(siteId, referenceId, "emergency_info");
    const notice = await this.resolvePublished(ref.organisationId, "emergency", ref.siteId);
    return {
      siteName: ref.siteName,
      title: NOTICE_KINDS.emergency.title,
      available: notice !== null,
      contentText: notice?.contentText ?? null,
      versionNumber: notice?.versionNumber ?? null,
      updatedAt: notice?.publishedAt ?? null,
    };
  }

  async publicInduction(siteId: string, referenceId: string) {
    const ref = await this.qr.validatePublicReference(siteId, referenceId, "contractor_induction");
    const notice = await this.resolvePublished(ref.organisationId, "induction", ref.siteId);
    return {
      siteName: ref.siteName,
      title: NOTICE_KINDS.induction.title,
      available: notice !== null,
      policyVersionId: notice?.versionId ?? null,
      contentText: notice?.contentText ?? null,
      versionNumber: notice?.versionNumber ?? null,
      updatedAt: notice?.publishedAt ?? null,
    };
  }

  /**
   * The contractor confirms they read the induction. Requires: a valid induction QR for the site, the phone of an open contractor visit
   * at that site, and the version that is published right now (so an old page cannot acknowledge replaced text). One acknowledgement per
   * visit and version; a repeat returns the first.
   */
  async acknowledgeInduction(input: {
    siteId: string;
    referenceId: string;
    visitorPhone: string;
    policyVersionId: string;
  }) {
    const ref = await this.qr.validatePublicReference(input.siteId, input.referenceId, "contractor_induction");
    const notice = await this.resolvePublished(ref.organisationId, "induction", ref.siteId);
    if (!notice) throw new NotFoundException("No induction has been published for this site yet");
    if (notice.versionId !== input.policyVersionId) {
      throw new ConflictException(
        "The induction was updated while you were reading it. Reload the page and read the new version.",
      );
    }

    const open = await this.visits.findOpenVisitsByPhone(ref.siteId, ref.organisationId, input.visitorPhone);
    const visit = open[0] ?? null;
    const typeCode = visit?.visitorCategoryCode ? await this.typeDefs.codeById(visit.visitorCategoryCode) : null;
    const refusal = inductionRefusal(
      visit ? { visitorTypeCode: typeCode, checkedOut: Boolean(visit.checkedOutAt) } : null,
    );
    if (refusal || !visit) throw new BadRequestException(refusal ?? "No open visit was found");

    const existing = await this.db.query.visitorPolicyAcknowledgements.findFirst({
      where: and(
        eq(visitorPolicyAcknowledgements.organisationId, ref.organisationId),
        eq(visitorPolicyAcknowledgements.visitId, visit.id),
        eq(visitorPolicyAcknowledgements.policyVersionId, notice.versionId),
        isNull(visitorPolicyAcknowledgements.deletedAt),
      ),
    });
    if (existing)
      return { acknowledged: true, acknowledgedAt: existing.acceptedAt?.toISOString() ?? null, repeated: true };

    const [legalBasis, method, language, channel] = await Promise.all([
      this.typeDefs.id("legal_basis_code", "mandatory_notice"),
      this.typeDefs.id("acknowledgement_method", "phone_tap"),
      this.typeDefs.id("language_code", notice.languageCode ?? "en"),
      this.typeDefs.id("capture_channel", "qr"),
    ]);
    const now = new Date();
    await this.db.insert(visitorPolicyAcknowledgements).values({
      id: randomUUID(),
      organisationId: ref.organisationId,
      visitId: visit.id,
      policyVersionId: notice.versionId,
      legalBasisCode: legalBasis,
      languageShownCode: language,
      displayedAt: now,
      acceptedAt: now,
      acknowledgementMethodCode: method,
      siteId: ref.siteId,
      captureChannelCode: channel,
    });
    return { acknowledged: true, acknowledgedAt: now.toISOString(), repeated: false };
  }

  private async requireSite(siteId: string, organisationId: string) {
    const site = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.organisationId, organisationId), isNull(sites.deletedAt)),
    });
    if (!site) throw new NotFoundException("Site not found");
    return site;
  }
}
