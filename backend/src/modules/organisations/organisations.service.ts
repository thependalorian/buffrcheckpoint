import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { organisations, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface CreateOrganisationInput {
  name: string;
  sectorCode: string; // type_definition code, domain 'organisation_sector'
}

@Injectable()
export class OrganisationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  // Internal/manual provisioning only (platform_support role) — see the
  // controller's comment. Self-serve tenant creation goes through
  // OnboardingService.createOrganisationAdmin instead, which creates the
  // organisation and its first Owner-Operator atomically.
  async create(input: CreateOrganisationInput) {
    const sectorCode = await this.typeDefs.id("organisation_sector", input.sectorCode);
    const [created] = await this.db
      .insert(organisations)
      .values({ id: randomUUID(), legalName: input.name, tradingName: input.name, sectorCode })
      .returning();
    return created;
  }

  async getOwn(user: AuthenticatedUser) {
    const found = await this.db.query.organisations.findFirst({
      where: and(eq(organisations.id, user.organisationId), isNull(organisations.deletedAt)),
    });
    if (!found) throw new NotFoundException("Organisation not found");

    let sectorCode: string | null = null;
    if (found.sectorCode) {
      const [sector] = await this.db
        .select({ code: typeDefinition.code })
        .from(typeDefinition)
        .where(eq(typeDefinition.id, found.sectorCode))
        .limit(1);
      sectorCode = sector?.code ?? null;
    }

    return {
      ...found,
      sectorCode,
    };
  }

  async updateOwn(
    user: AuthenticatedUser,
    input: { legalName?: string; tradingName?: string; defaultTimezone?: string; sectorCode?: string },
  ) {
    const patch: {
      legalName?: string;
      tradingName?: string;
      defaultTimezone?: string;
      sectorCode?: string;
    } = {};
    if (input.legalName?.trim()) patch.legalName = input.legalName.trim();
    if (input.tradingName?.trim()) patch.tradingName = input.tradingName.trim();
    if (input.defaultTimezone?.trim()) patch.defaultTimezone = input.defaultTimezone.trim();
    if (input.sectorCode?.trim()) {
      patch.sectorCode = await this.typeDefs.id("organisation_sector", input.sectorCode.trim());
    }
    if (Object.keys(patch).length === 0) {
      return this.getOwn(user);
    }
    const [updated] = await this.db
      .update(organisations)
      .set(patch)
      .where(and(eq(organisations.id, user.organisationId), isNull(organisations.deletedAt)))
      .returning();
    if (!updated) throw new NotFoundException("Organisation not found");
    return updated;
  }
}
