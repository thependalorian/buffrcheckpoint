import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { platformConfigurationSetting, platformConfigurationSettingStatusLog } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

export const HEALTH_SCORE_WEIGHTS_KEY = "organisation_health_score_weights";

export interface HealthScoreWeights {
  baseScore: number;
  visitVolumeTrendWeight: number;
  visitVolumeTrendFloor: number;
  visitVolumeTrendCeiling: number;
  adminLoginRecencyPerDay: number;
  adminLoginRecencyCap: number;
  notificationFailureWeight: number;
  deviceOfflineWeight: number;
  lowRiskBandFloor: number;
  mediumRiskBandFloor: number;
}

/**
 * The values organisation-health.service.ts's scoreFrom() used as private
 * constants before migration 0029 made them config. Kept here as the
 * fallback so an unseeded database scores exactly as it did before.
 */
export const DEFAULT_HEALTH_SCORE_WEIGHTS: HealthScoreWeights = {
  baseScore: 100,
  visitVolumeTrendWeight: 40,
  visitVolumeTrendFloor: -40,
  visitVolumeTrendCeiling: 20,
  adminLoginRecencyPerDay: 1,
  adminLoginRecencyCap: 30,
  notificationFailureWeight: 20,
  deviceOfflineWeight: 20,
  lowRiskBandFloor: 70,
  mediumRiskBandFloor: 40,
};

const WEIGHT_BOUNDS: Record<keyof HealthScoreWeights, [number, number]> = {
  baseScore: [0, 100],
  visitVolumeTrendWeight: [0, 100],
  visitVolumeTrendFloor: [-100, 0],
  visitVolumeTrendCeiling: [0, 100],
  adminLoginRecencyPerDay: [0, 10],
  adminLoginRecencyCap: [0, 100],
  notificationFailureWeight: [0, 100],
  deviceOfflineWeight: [0, 100],
  lowRiskBandFloor: [0, 100],
  mediumRiskBandFloor: [0, 100],
};

/** Audited JSONB platform config. Every write appends a before/after log row. */
@Injectable()
export class PlatformConfigurationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async healthScoreWeights(): Promise<HealthScoreWeights> {
    const row = await this.findByKey(HEALTH_SCORE_WEIGHTS_KEY);
    if (!row) return DEFAULT_HEALTH_SCORE_WEIGHTS;
    // Merge rather than replace: a partially-populated row still scores.
    return { ...DEFAULT_HEALTH_SCORE_WEIGHTS, ...(row.settingValue as Partial<HealthScoreWeights>) };
  }

  async getHealthScoreWeightsWithMeta() {
    const row = await this.findByKey(HEALTH_SCORE_WEIGHTS_KEY);
    return {
      settingKey: HEALTH_SCORE_WEIGHTS_KEY,
      weights: await this.healthScoreWeights(),
      seeded: Boolean(row),
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
      bounds: WEIGHT_BOUNDS,
    };
  }

  async updateHealthScoreWeights(input: Partial<HealthScoreWeights>, user: AuthenticatedUser, note?: string) {
    const current = await this.healthScoreWeights();
    const next: HealthScoreWeights = { ...current };

    for (const [key, [min, max]] of Object.entries(WEIGHT_BOUNDS) as [keyof HealthScoreWeights, [number, number]][]) {
      const candidate = input[key];
      if (candidate === undefined) continue;
      if (typeof candidate !== "number" || Number.isNaN(candidate)) {
        throw new BadRequestException(`${key} must be a number`);
      }
      if (candidate < min || candidate > max) {
        throw new BadRequestException(`${key} must be between ${min} and ${max}`);
      }
      next[key] = candidate;
    }

    if (next.mediumRiskBandFloor >= next.lowRiskBandFloor) {
      throw new BadRequestException("mediumRiskBandFloor must be below lowRiskBandFloor");
    }

    return this.upsert(HEALTH_SCORE_WEIGHTS_KEY, next, user, note);
  }

  async changeLog(settingKey: string) {
    const row = await this.findByKey(settingKey);
    if (!row) return [];
    return this.db.query.platformConfigurationSettingStatusLog.findMany({
      where: eq(platformConfigurationSettingStatusLog.settingId, row.id),
      orderBy: desc(platformConfigurationSettingStatusLog.occurredAt),
      limit: 50,
    });
  }

  private async findByKey(settingKey: string) {
    return (
      (await this.db.query.platformConfigurationSetting.findFirst({
        where: and(
          eq(platformConfigurationSetting.settingKey, settingKey),
          isNull(platformConfigurationSetting.deletedAt),
        ),
      })) ?? null
    );
  }

  private async upsert(settingKey: string, value: unknown, user: AuthenticatedUser, note?: string) {
    const existing = await this.findByKey(settingKey);

    if (!existing) {
      const id = randomUUID();
      const [created] = await this.db
        .insert(platformConfigurationSetting)
        .values({ id, settingKey, settingValue: value, updatedBy: user.userId, updatedAt: new Date() })
        .returning();
      await this.appendLog(id, "created", user, null, value, note);
      return created;
    }

    await this.db
      .update(platformConfigurationSetting)
      .set({ settingValue: value, updatedBy: user.userId, updatedAt: new Date() })
      .where(eq(platformConfigurationSetting.id, existing.id));
    await this.appendLog(existing.id, "updated", user, existing.settingValue, value, note);

    const row = await this.db.query.platformConfigurationSetting.findFirst({
      where: eq(platformConfigurationSetting.id, existing.id),
    });
    if (!row) throw new NotFoundException("Configuration setting not found after update");
    return row;
  }

  private async appendLog(
    settingId: string,
    event: "created" | "updated" | "deactivated",
    user: AuthenticatedUser,
    before: unknown,
    after: unknown,
    note?: string,
  ) {
    await this.db.insert(platformConfigurationSettingStatusLog).values({
      id: randomUUID(),
      settingId,
      eventTypeCode: await this.typeDefs.id("platform_config_change_event_type", event),
      actorId: user.userId,
      beforeValue: before ?? null,
      afterValue: after ?? null,
      note,
    });
  }
}
