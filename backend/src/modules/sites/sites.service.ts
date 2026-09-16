import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { sites, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface CreateSiteInput {
  name: string;
  regionId?: string | null;
}

@Injectable()
export class SitesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async create(input: CreateSiteInput, user: AuthenticatedUser) {
    const [created] = await this.db
      .insert(sites)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        regionId: input.regionId ?? null,
        name: input.name,
      })
      .returning();
    return created;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.sites.findMany({
      where: and(eq(sites.organisationId, user.organisationId), isNull(sites.deletedAt)),
    });
  }

  /** Platform Ops Console's org-detail Sites tab — explicit organisationId, not the caller's own. */
  async listForOrganisation(organisationId: string) {
    return this.db.query.sites.findMany({
      where: and(eq(sites.organisationId, organisationId), isNull(sites.deletedAt)),
    });
  }

  /** Cross-org site register for Ops Console top-level Sites list. */
  async listAllPlatform(organisationId?: string) {
    return this.db
      .select({
        id: sites.id,
        organisationId: sites.organisationId,
        name: sites.name,
        siteCode: sites.siteCode,
        physicalAddress: sites.physicalAddress,
        timezone: sites.timezone,
        statusCode: typeDefinition.code,
      })
      .from(sites)
      .leftJoin(typeDefinition, eq(sites.statusCode, typeDefinition.id))
      .where(
        organisationId
          ? and(eq(sites.organisationId, organisationId), isNull(sites.deletedAt))
          : isNull(sites.deletedAt),
      );
  }

  async getById(siteId: string, user: AuthenticatedUser) {
    const found = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.organisationId, user.organisationId), isNull(sites.deletedAt)),
    });
    if (!found) throw new NotFoundException("Site not found");
    return found;
  }

  /** Platform Ops Console's site detail page — explicit organisationId, same shape as getById(). */
  async getByIdForOrganisation(siteId: string, organisationId: string) {
    const found = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.organisationId, organisationId), isNull(sites.deletedAt)),
    });
    if (!found) throw new NotFoundException("Site not found");
    return found;
  }

  async update(
    siteId: string,
    input: {
      name?: string;
      regionId?: string | null;
      physicalAddress?: string;
      siteCode?: string;
      statusCode?: string;
    },
    user: AuthenticatedUser,
  ) {
    await this.getById(siteId, user);
    const statusId =
      input.statusCode !== undefined ? await this.typeDefs.id("site_status", input.statusCode) : undefined;
    const [updated] = await this.db
      .update(sites)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
        ...(input.physicalAddress !== undefined ? { physicalAddress: input.physicalAddress } : {}),
        ...(input.siteCode !== undefined ? { siteCode: input.siteCode } : {}),
        ...(statusId !== undefined ? { statusCode: statusId } : {}),
      })
      .where(and(eq(sites.id, siteId), eq(sites.organisationId, user.organisationId)))
      .returning();
    return updated;
  }

  /** Ops Console site status change — organisationId is the target tenant. */
  async setStatusForOrganisation(siteId: string, organisationId: string, statusCode: string) {
    await this.getByIdForOrganisation(siteId, organisationId);
    const statusId = await this.typeDefs.id("site_status", statusCode);
    const [updated] = await this.db
      .update(sites)
      .set({ statusCode: statusId })
      .where(and(eq(sites.id, siteId), eq(sites.organisationId, organisationId)))
      .returning();
    return updated;
  }

  // Soft delete only (Section 11.4.5 rule 7) — never a hard DELETE on
  // operational records.
  async softDelete(siteId: string, user: AuthenticatedUser) {
    const [updated] = await this.db
      .update(sites)
      .set({ deletedAt: new Date() })
      .where(and(eq(sites.id, siteId), eq(sites.organisationId, user.organisationId)))
      .returning();
    if (!updated) throw new NotFoundException("Site not found");
    return updated;
  }
}
