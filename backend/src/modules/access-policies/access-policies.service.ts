import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { accessPolicy } from "../../db/schema";
import { randomUUID } from "node:crypto";

export interface CreateAccessPolicyInput {
  siteId?: string;
  zoneId?: string;
  config: Record<string, unknown>;
}

@Injectable()
export class AccessPoliciesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(input: CreateAccessPolicyInput, user: AuthenticatedUser) {
    const [created] = await this.db
      .insert(accessPolicy)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: input.siteId ?? null,
        zoneId: input.zoneId ?? null,
        config: input.config,
      })
      .returning();
    return created;
  }

  async list(user: AuthenticatedUser) {
    return this.db.query.accessPolicy.findMany({
      where: and(eq(accessPolicy.organisationId, user.organisationId), isNull(accessPolicy.deletedAt)),
    });
  }

  async update(policyId: string, config: Record<string, unknown>, user: AuthenticatedUser) {
    const [updated] = await this.db
      .update(accessPolicy)
      .set({ config })
      .where(and(eq(accessPolicy.id, policyId), eq(accessPolicy.organisationId, user.organisationId)))
      .returning();
    if (!updated) throw new NotFoundException("Access policy not found");
    return updated;
  }
}
