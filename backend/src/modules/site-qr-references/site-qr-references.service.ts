import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createHmac, randomUUID } from "node:crypto";

import { buildPublicCheckInQrUrl } from "../../common/assets/public-asset-url";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { siteQrReferenceRotations, siteQrReferences, sites, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import type { CreateSiteQrReferenceDto, RotateSiteQrReferenceDto } from "./dto/site-qr-references.dto";

export interface ValidatedPublicCheckInReference {
  organisationId: string;
  siteId: string;
  siteName: string;
  referenceId: string;
  label: string;
}

@Injectable()
export class SiteQrReferencesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async create(dto: CreateSiteQrReferenceDto, user: AuthenticatedUser) {
    // Only QR types with a live consuming journey may be issued. Other
    // site_qr_type codes exist in type_definition for roadmap/schema, but
    // printing them today is a dead end (§11.9.8.1 / Tier 2 gap triage).
    const implementedQrTypes = new Set(["public_site_checkin"]);
    if (!implementedQrTypes.has(dto.qrTypeCode)) {
      throw new BadRequestException(
        `QR type "${dto.qrTypeCode}" has no consuming journey yet. Issue public_site_checkin only.`,
      );
    }
    const qrTypeCode = await this.typeDefs.id("site_qr_type", dto.qrTypeCode);
    const [created] = await this.db
      .insert(siteQrReferences)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: dto.siteId,
        qrTypeCode,
        label: dto.label ?? null,
      })
      .returning();
    return created;
  }

  async list(user: AuthenticatedUser) {
    const rows = await this.db.query.siteQrReferences.findMany({
      where: and(eq(siteQrReferences.organisationId, user.organisationId), isNull(siteQrReferences.deletedAt)),
    });
    return Promise.all(
      rows.map(async (row) => {
        const typeRow = await this.db.query.typeDefinition.findFirst({
          where: eq(typeDefinition.id, row.qrTypeCode),
        });
        return {
          ...row,
          qrTypeCode: typeRow?.code ?? row.qrTypeCode,
          qrTypeLabel: typeRow?.label ?? typeRow?.code ?? "Unknown",
        };
      }),
    );
  }

  async getById(referenceId: string, user: AuthenticatedUser) {
    const found = await this.db.query.siteQrReferences.findFirst({
      where: and(
        eq(siteQrReferences.id, referenceId),
        eq(siteQrReferences.organisationId, user.organisationId),
        isNull(siteQrReferences.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Site QR reference not found");
    return found;
  }

  async listRotations(referenceId: string, user: AuthenticatedUser) {
    const reference = await this.getById(referenceId, user);
    return this.db.query.siteQrReferenceRotations.findMany({
      where: and(
        eq(siteQrReferenceRotations.siteQrReferenceId, reference.id),
        eq(siteQrReferenceRotations.organisationId, user.organisationId),
      ),
      orderBy: [desc(siteQrReferenceRotations.activeFrom)],
    });
  }

  async rotate(referenceId: string, dto: RotateSiteQrReferenceDto, user: AuthenticatedUser) {
    const reference = await this.getById(referenceId, user);
    const now = new Date();
    const activeUntil = dto.activeUntil
      ? new Date(dto.activeUntil)
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const opaqueToken = randomUUID();
    const opaqueTokenHmac = this.tokenHmac(opaqueToken);

    const priorRotation = await this.db.query.siteQrReferenceRotations.findFirst({
      where: and(
        eq(siteQrReferenceRotations.siteQrReferenceId, reference.id),
        eq(siteQrReferenceRotations.organisationId, user.organisationId),
      ),
      orderBy: [desc(siteQrReferenceRotations.activeFrom)],
    });

    // First rotation on a brand-new reference: keep the same ref id.
    // Subsequent rotates: soft-delete + new ref so old printed URLs fail closed.
    let targetRef = reference;
    if (priorRotation) {
      await this.db
        .update(siteQrReferences)
        .set({ deletedAt: now })
        .where(and(eq(siteQrReferences.id, reference.id), eq(siteQrReferences.organisationId, user.organisationId)));

      const [createdRef] = await this.db
        .insert(siteQrReferences)
        .values({
          id: randomUUID(),
          organisationId: user.organisationId,
          siteId: reference.siteId,
          qrTypeCode: reference.qrTypeCode,
          label: reference.label,
        })
        .returning();
      targetRef = createdRef;
    }

    const [created] = await this.db
      .insert(siteQrReferenceRotations)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: targetRef.siteId,
        siteQrReferenceId: targetRef.id,
        opaqueTokenHmac,
        activeFrom: now,
        activeUntil,
      })
      .returning();

    return {
      reference: targetRef,
      rotation: created,
      opaqueToken,
      checkInUrl: buildPublicCheckInQrUrl(targetRef.siteId, targetRef.id),
    };
  }

  /** Active public site check-in QR for kiosk welcome display. */
  async getActivePublicCheckInForSite(siteId: string, organisationId: string) {
    const publicCheckInType = await this.typeDefs.id("site_qr_type", "public_site_checkin");
    const reference = await this.db.query.siteQrReferences.findFirst({
      where: and(
        eq(siteQrReferences.organisationId, organisationId),
        eq(siteQrReferences.siteId, siteId),
        eq(siteQrReferences.qrTypeCode, publicCheckInType),
        isNull(siteQrReferences.deletedAt),
      ),
    });
    if (!reference) return null;

    const now = new Date();
    const rotation = await this.db.query.siteQrReferenceRotations.findFirst({
      where: and(
        eq(siteQrReferenceRotations.siteQrReferenceId, reference.id),
        eq(siteQrReferenceRotations.organisationId, organisationId),
      ),
      orderBy: [desc(siteQrReferenceRotations.activeFrom)],
    });

    const active = rotation ? rotation.activeUntil > now : false;

    return {
      referenceId: reference.id,
      label: reference.label ?? "Scan to check in on your phone",
      payload: buildPublicCheckInQrUrl(siteId, reference.id),
      active,
    };
  }

  /**
   * Kiosk welcome must always receive a scannable QR — auto-provision reference
   * + rotation when a site has none yet (idempotent for existing sites).
   */
  async resolvePublicCheckInForSite(siteId: string, user: AuthenticatedUser) {
    const existing = await this.getActivePublicCheckInForSite(siteId, user.organisationId);
    if (existing?.active) return existing;

    const publicCheckInType = await this.typeDefs.id("site_qr_type", "public_site_checkin");
    let reference = await this.db.query.siteQrReferences.findFirst({
      where: and(
        eq(siteQrReferences.organisationId, user.organisationId),
        eq(siteQrReferences.siteId, siteId),
        eq(siteQrReferences.qrTypeCode, publicCheckInType),
        isNull(siteQrReferences.deletedAt),
      ),
    });

    if (!reference) {
      const [created] = await this.db
        .insert(siteQrReferences)
        .values({
          id: randomUUID(),
          organisationId: user.organisationId,
          siteId,
          qrTypeCode: publicCheckInType,
          label: "Public site check-in",
        })
        .returning();
      reference = created;
    }

    const now = new Date();
    const latestRotation = await this.db.query.siteQrReferenceRotations.findFirst({
      where: and(
        eq(siteQrReferenceRotations.siteQrReferenceId, reference.id),
        eq(siteQrReferenceRotations.organisationId, user.organisationId),
      ),
      orderBy: [desc(siteQrReferenceRotations.activeFrom)],
    });

    if (!latestRotation || latestRotation.activeUntil <= now) {
      const opaqueToken = randomUUID();
      await this.db.insert(siteQrReferenceRotations).values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId,
        siteQrReferenceId: reference.id,
        opaqueTokenHmac: this.tokenHmac(opaqueToken),
        activeFrom: now,
        activeUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      });
    }

    return {
      referenceId: reference.id,
      label: reference.label ?? "Scan to check in on your phone",
      payload: buildPublicCheckInQrUrl(siteId, reference.id),
      active: true,
    };
  }

  /**
   * Public mobile check-in: prove the site+ref pair is an active
   * public_site_checkin QR (no auth). Used by GET/POST /public/check-in.
   */
  async validatePublicCheckInReference(
    siteId: string,
    referenceId: string,
  ): Promise<ValidatedPublicCheckInReference> {
    if (!siteId || !referenceId) {
      throw new BadRequestException("site and ref query parameters are required");
    }

    const site = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), isNull(sites.deletedAt)),
    });
    if (!site) throw new NotFoundException("Check-in link is not valid for this site");

    const publicCheckInType = await this.typeDefs.id("site_qr_type", "public_site_checkin");
    const reference = await this.db.query.siteQrReferences.findFirst({
      where: and(
        eq(siteQrReferences.id, referenceId),
        eq(siteQrReferences.siteId, siteId),
        eq(siteQrReferences.organisationId, site.organisationId),
        eq(siteQrReferences.qrTypeCode, publicCheckInType),
        isNull(siteQrReferences.deletedAt),
      ),
    });
    if (!reference) throw new NotFoundException("Check-in link is not valid");

    const now = new Date();
    const rotation = await this.db.query.siteQrReferenceRotations.findFirst({
      where: and(
        eq(siteQrReferenceRotations.siteQrReferenceId, reference.id),
        eq(siteQrReferenceRotations.organisationId, site.organisationId),
      ),
      orderBy: [desc(siteQrReferenceRotations.activeFrom)],
    });
    if (!rotation || rotation.activeUntil <= now) {
      throw new NotFoundException("Check-in link has expired — ask reception for a new QR");
    }

    return {
      organisationId: site.organisationId,
      siteId: site.id,
      siteName: site.name,
      referenceId: reference.id,
      label: reference.label ?? "Visitor check-in",
    };
  }

  private tokenHmac(token: string): string {
    const pepper = process.env.QR_TOKEN_PEPPER ?? "dev-qr-token-pepper-change-me";
    return createHmac("sha256", pepper).update(token).digest("hex");
  }
}
