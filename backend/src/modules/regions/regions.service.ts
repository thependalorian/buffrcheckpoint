import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { regions } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

@Injectable()
export class RegionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async create(input: { name: string; code?: string }, user: AuthenticatedUser) {
    const statusCode = await this.typeDefs.id("region_status", "active");
    const [created] = await this.db
      .insert(regions)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        name: input.name,
        code: input.code ?? null,
        statusCode,
      })
      .returning();
    return created;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.regions.findMany({
      where: and(eq(regions.organisationId, user.organisationId), isNull(regions.deletedAt)),
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const found = await this.db.query.regions.findFirst({
      where: and(eq(regions.id, id), eq(regions.organisationId, user.organisationId), isNull(regions.deletedAt)),
    });
    if (!found) throw new NotFoundException("Region not found");
    return found;
  }

  async update(id: string, input: { name?: string; code?: string }, user: AuthenticatedUser) {
    await this.getById(id, user);
    const [updated] = await this.db
      .update(regions)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
      })
      .where(and(eq(regions.id, id), eq(regions.organisationId, user.organisationId)))
      .returning();
    return updated;
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const [updated] = await this.db
      .update(regions)
      .set({ deletedAt: new Date() })
      .where(and(eq(regions.id, id), eq(regions.organisationId, user.organisationId)))
      .returning();
    if (!updated) throw new NotFoundException("Region not found");
    return updated;
  }
}
