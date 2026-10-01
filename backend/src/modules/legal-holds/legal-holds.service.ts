import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { legalHoldStatusEvents, legalHolds, typeDefinition } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface CreateLegalHoldInput {
  scope: Record<string, unknown>; // e.g. { siteId, dateRangeStart, dateRangeEnd }
  reason: string;
}

@Injectable()
export class LegalHoldsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async create(input: CreateLegalHoldInput, user: AuthenticatedUser) {
    const activeStatus = await this.typeDefs.id("legal_hold_status", "active");

    const [created] = await this.db
      .insert(legalHolds)
      .values({
        id: randomUUID(),
        organisationId: user.organisationId,
        scope: input.scope,
      })
      .returning();

    await this.db.insert(legalHoldStatusEvents).values({
      id: randomUUID(),
      legalHoldId: created.id,
      statusCode: activeStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason: input.reason,
    });

    return { ...created, active: true };
  }

  // Current state = "most recent legal_hold_status_log row" (Section
  // 11.4.5a), not a column on legal_hold itself.
  private async isActive(legalHoldId: string): Promise<boolean> {
    const latest = await this.db
      .select({ code: typeDefinition.code })
      .from(legalHoldStatusEvents)
      .innerJoin(typeDefinition, eq(legalHoldStatusEvents.statusCode, typeDefinition.id))
      .where(eq(legalHoldStatusEvents.legalHoldId, legalHoldId))
      .orderBy(desc(legalHoldStatusEvents.occurredAt))
      .limit(1);
    return latest[0]?.code === "active";
  }

  async list(user: AuthenticatedUser) {
    const holds = await this.db.query.legalHolds.findMany({
      where: and(eq(legalHolds.organisationId, user.organisationId), isNull(legalHolds.deletedAt)),
    });
    return Promise.all(holds.map(async (hold) => ({ ...hold, active: await this.isActive(hold.id) })));
  }

  // System read for the retention disposition job (no request user): the
  // scopes of every currently active hold in one organisation.
  async activeHoldScopes(organisationId: string): Promise<Array<{ id: string; scope: Record<string, unknown> }>> {
    const holds = await this.db.query.legalHolds.findMany({
      where: and(eq(legalHolds.organisationId, organisationId), isNull(legalHolds.deletedAt)),
    });
    const active = await Promise.all(holds.map(async (hold) => ((await this.isActive(hold.id)) ? hold : null)));
    return active
      .filter((hold): hold is NonNullable<typeof hold> => hold !== null)
      .map((hold) => ({ id: hold.id, scope: (hold.scope ?? {}) as Record<string, unknown> }));
  }

  // Section 8.9's data lifecycle journey: retention/deletion checks a
  // legal_hold before archiving/deleting a record — this is the release
  // step, letting an org's deletion jobs proceed again for that scope.
  async release(legalHoldId: string, reason: string, user: AuthenticatedUser) {
    const found = await this.db.query.legalHolds.findFirst({
      where: and(eq(legalHolds.id, legalHoldId), eq(legalHolds.organisationId, user.organisationId)),
    });
    if (!found) throw new NotFoundException("Legal hold not found");

    const releasedStatus = await this.typeDefs.id("legal_hold_status", "released");

    await this.db.insert(legalHoldStatusEvents).values({
      id: randomUUID(),
      legalHoldId,
      statusCode: releasedStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      reason,
    });

    return { legalHoldId, active: false };
  }
}
