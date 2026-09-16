import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { retentionPolicies } from "../../db/schema";
import { randomUUID } from "node:crypto";

function scopeCondition(organisationId: string, siteId: string | null) {
  return siteId
    ? and(eq(retentionPolicies.organisationId, organisationId), eq(retentionPolicies.siteId, siteId))
    : and(eq(retentionPolicies.organisationId, organisationId), isNull(retentionPolicies.siteId));
}

@Injectable()
export class RetentionPolicyService {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Section 11.4.5a behavioral fix: retention_policy.version is never
  // UPDATEd on an existing row once referenced by any
  // visit.retention_policy_version — a policy change is always a new row
  // with version = version + 1. This service is the one place that rule is
  // enforced, since no prior controller wrote to this table at all.
  async create(input: { siteId?: string; retentionDays: number }, user: AuthenticatedUser) {
    const siteId = input.siteId ?? null;
    const existing = await this.currentRow(user.organisationId, siteId);
    if (existing) {
      throw new ConflictException(
        "A retention policy already exists for this scope — use the update endpoint to create a new version",
      );
    }

    const [created] = await this.db
      .insert(retentionPolicies)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId,
        retentionDays: input.retentionDays,
        version: 1,
      })
      .returning();
    return created;
  }

  private async currentRow(organisationId: string, siteId: string | null) {
    const rows = await this.db.query.retentionPolicies.findMany({
      where: and(scopeCondition(organisationId, siteId), isNull(retentionPolicies.deletedAt)),
      orderBy: [desc(retentionPolicies.version)],
      limit: 1,
    });
    return rows[0];
  }

  // Organisation default (siteId undefined) plus each site's current
  // (highest-version, non-deleted) row — never every historical version.
  async list(user: AuthenticatedUser) {
    const rows = await this.db.query.retentionPolicies.findMany({
      where: and(eq(retentionPolicies.organisationId, user.organisationId), isNull(retentionPolicies.deletedAt)),
      orderBy: [desc(retentionPolicies.version)],
    });
    const currentBySiteId = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = row.siteId ?? "__organisation_default__";
      if (!currentBySiteId.has(key)) currentBySiteId.set(key, row); // rows already sorted newest-version-first
    }
    return Array.from(currentBySiteId.values());
  }

  async getCurrent(siteId: string | undefined, user: AuthenticatedUser) {
    const found = await this.currentRow(user.organisationId, siteId ?? null);
    if (!found) throw new NotFoundException("No retention policy configured for this scope");
    return found;
  }

  // Never an UPDATE on the referenced row — a new row, one version higher.
  // Prior versions stay (soft-delete-only, Wiebe rule 7) since a `visit`
  // may still reference their exact version number.
  async createNewVersion(siteId: string | undefined, retentionDays: number, user: AuthenticatedUser) {
    const scopedSiteId = siteId ?? null;
    const current = await this.currentRow(user.organisationId, scopedSiteId);
    if (!current) throw new NotFoundException("No retention policy configured for this scope — create one first");

    const [created] = await this.db
      .insert(retentionPolicies)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        siteId: scopedSiteId,
        retentionDays,
        version: current.version + 1,
      })
      .returning();
    return created;
  }
}
