import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { securityZones, sites } from "../../db/schema";
import { randomUUID } from "node:crypto";

@Injectable()
export class SecurityZonesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(
    input: { siteId: string; name: string; zoneCode?: string; hostApprovalRequired?: boolean },
    user: AuthenticatedUser,
  ) {
    const site = await this.db.query.sites.findFirst({
      where: and(eq(sites.id, input.siteId), eq(sites.organisationId, user.organisationId), isNull(sites.deletedAt)),
    });
    if (!site) throw new NotFoundException("Site not found");

    const [created] = await this.db
      .insert(securityZones)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: input.siteId,
        name: input.name,
        zoneCode: input.zoneCode ?? null,
        hostApprovalRequired: input.hostApprovalRequired ?? false,
      })
      .returning();
    return created;
  }

  async list(siteId: string | undefined, user: AuthenticatedUser) {
    if (siteId) {
      return this.db.query.securityZones.findMany({
        where: and(
          eq(securityZones.organisationId, user.organisationId),
          eq(securityZones.siteId, siteId),
          isNull(securityZones.deletedAt),
        ),
      });
    }
    return this.db.query.securityZones.findMany({
      where: and(eq(securityZones.organisationId, user.organisationId), isNull(securityZones.deletedAt)),
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const found = await this.db.query.securityZones.findFirst({
      where: and(
        eq(securityZones.id, id),
        eq(securityZones.organisationId, user.organisationId),
        isNull(securityZones.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Security zone not found");
    return found;
  }

  async update(
    id: string,
    input: { name?: string; zoneCode?: string; hostApprovalRequired?: boolean },
    user: AuthenticatedUser,
  ) {
    await this.getById(id, user);
    const [updated] = await this.db
      .update(securityZones)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.zoneCode !== undefined ? { zoneCode: input.zoneCode } : {}),
        ...(input.hostApprovalRequired !== undefined ? { hostApprovalRequired: input.hostApprovalRequired } : {}),
      })
      .where(and(eq(securityZones.id, id), eq(securityZones.organisationId, user.organisationId)))
      .returning();
    return updated;
  }

  async softDelete(id: string, user: AuthenticatedUser) {
    const [updated] = await this.db
      .update(securityZones)
      .set({ deletedAt: new Date() })
      .where(and(eq(securityZones.id, id), eq(securityZones.organisationId, user.organisationId)))
      .returning();
    if (!updated) throw new NotFoundException("Security zone not found");
    return updated;
  }
}
