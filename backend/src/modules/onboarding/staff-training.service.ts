import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { staffTrainingAcknowledgements } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { OnboardingStateService } from "../onboarding-state/onboarding-state.service";

export const CURRENT_TRAINING_VERSION = "checkpoint_2026_10";

/** Append-only acknowledgements behind the Staff training checklist step (0052). */
@Injectable()
export class StaffTrainingService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly onboardingState: OnboardingStateService,
  ) {}

  async acknowledge(id: string, user: AuthenticatedUser) {
    const [roleCode, trainingVersionCode] = await Promise.all([
      this.typeDefs.id("role_code", user.roleCode),
      this.typeDefs.id("staff_training_version", CURRENT_TRAINING_VERSION),
    ]);
    const acknowledgedAt = new Date();
    await this.db
      .insert(staffTrainingAcknowledgements)
      .values({
        id,
        organisationId: user.organisationId,
        userId: user.userId,
        roleCode,
        trainingVersionCode,
        acknowledgedAt,
      })
      .onConflictDoNothing({ target: staffTrainingAcknowledgements.id });
    this.onboardingState.notifyChanged(user.organisationId);
    return this.latest(user);
  }

  async latest(user: AuthenticatedUser) {
    const [row] = await this.db
      .select({
        id: staffTrainingAcknowledgements.id,
        acknowledgedAt: staffTrainingAcknowledgements.acknowledgedAt,
      })
      .from(staffTrainingAcknowledgements)
      .where(
        and(
          eq(staffTrainingAcknowledgements.organisationId, user.organisationId),
          eq(staffTrainingAcknowledgements.userId, user.userId),
          isNull(staffTrainingAcknowledgements.deletedAt),
        ),
      )
      .orderBy(desc(staffTrainingAcknowledgements.acknowledgedAt))
      .limit(1);
    return { trainingVersion: CURRENT_TRAINING_VERSION, acknowledgement: row ?? null };
  }
}
