import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";

import { sessionCache } from "../../common/auth/session-cache";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.token";
import { organisationOnboardingStates, organisationOnboardingStatusLog, organisations } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import {
  assertTransition,
  earlyStagePath,
  IllegalOnboardingTransitionError,
  isOnboardingStatus,
  type OnboardingStatus,
  type TransitionMode,
} from "./onboarding-transitions";
import { randomUUID } from "node:crypto";

export type OnboardingStateRow = typeof organisationOnboardingStates.$inferSelect;

export interface ProgressCommit {
  state: OnboardingStateRow;
  expectedVersion: number;
  completed: string[];
  skipped: string[];
  currentStepId: string | null;
  launchRouteId: string | null;
  toStatusId: string;
  actorId: string;
  stepCode?: string;
  /** Set only when this write approves go-live. */
  goliveApprovedBy: string | null;
}

export interface OnboardingLogEntry {
  organisationId: string;
  stateId: string;
  fromStatusId: string | null;
  toStatusId: string;
  actorId: string | null;
  stepCode?: string | null;
  reason?: string | null;
}

/**
 * Single owner of organisation onboarding status. Every status change goes
 * through the transition map and writes an immutable status-log row;
 * backward moves exist only as reasoned ops overrides.
 */
@Injectable()
export class OnboardingStateService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  /** Makes a status or progress change visible to the next session lookup. */
  notifyChanged(organisationId: string): void {
    sessionCache.invalidateOrganisation(organisationId);
  }

  async getState(organisationId: string): Promise<OnboardingStateRow | undefined> {
    return this.db.query.organisationOnboardingStates.findFirst({
      where: and(
        eq(organisationOnboardingStates.organisationId, organisationId),
        isNull(organisationOnboardingStates.deletedAt),
      ),
    });
  }

  async statusOf(state: OnboardingStateRow | undefined): Promise<OnboardingStatus | null> {
    if (!state) return null;
    const code = await this.typeDefs.codeById(state.statusCode);
    return isOnboardingStatus(code) ? code : null;
  }

  /**
   * User activation (email verification, MFA enrolment). Moves the organisation
   * forward to `target` only when it is still behind it; an organisation that
   * is further along (including live or suspended) is never touched, so an
   * invited user only ever changes their own user row.
   */
  async advanceIfEarlyStage(
    organisationId: string,
    target: OnboardingStatus,
    actorId: string | null,
    stepCode?: string,
  ): Promise<void> {
    const state = await this.getState(organisationId);
    if (!state) {
      // Legacy organisation without a state row: start it at the target.
      await this.createState(organisationId, target, actorId, stepCode);
      return;
    }
    const current = await this.statusOf(state);
    if (!current) return;

    const path = earlyStagePath(current, target);
    let fromId = state.statusCode;
    for (const next of path) {
      const toId = await this.typeDefs.id("organisation_onboarding_status", next);
      await this.writeStatus(state, fromId, toId, actorId, { stepCode });
      fromId = toId;
    }
    if (path.length > 0) this.notifyChanged(organisationId);
  }

  /** Forward application transition (e.g. in_progress -> ready_for_golive). */
  async transition(
    organisationId: string,
    to: OnboardingStatus,
    actorId: string | null,
    options: { stepCode?: string; reason?: string; mode?: TransitionMode } = {},
  ): Promise<void> {
    const state = await this.requireState(organisationId);
    const current = await this.statusOf(state);
    this.assert(current, to, options.mode ?? "forward");
    const toId = await this.typeDefs.id("organisation_onboarding_status", to);
    await this.writeStatus(state, state.statusCode, toId, actorId, options);
    this.notifyChanged(organisationId);
  }

  /** Ops: send a ready/live/suspended organisation back to setup. Reason is mandatory. */
  async reopenSetup(organisationId: string, actorId: string, reason: string) {
    const cleanReason = this.requireReason(reason);
    const state = await this.requireState(organisationId);
    const current = await this.statusOf(state);
    if (current !== "ready_for_golive" && current !== "live" && current !== "suspended") {
      throw new ConflictException(`Setup is already open (status ${current ?? "unknown"})`);
    }
    const toId = await this.typeDefs.id("organisation_onboarding_status", "in_progress");
    await this.writeStatus(state, state.statusCode, toId, actorId, {
      reason: cleanReason,
      patch: { goliveApprovedAt: null, goliveApprovedBy: null },
    });
    this.notifyChanged(organisationId);
    return { organisationId, fromStatus: current, toStatus: "in_progress" as const };
  }

  /** Ops override to any legal target, replacing direct-SQL status edits. */
  async setStatus(organisationId: string, to: string, actorId: string, reason: string) {
    if (!isOnboardingStatus(to)) {
      throw new BadRequestException(`Unknown onboarding status '${to}'`);
    }
    const cleanReason = this.requireReason(reason);
    const state = await this.requireState(organisationId);
    const current = await this.statusOf(state);
    this.assert(current, to, "override");
    const toId = await this.typeDefs.id("organisation_onboarding_status", to);
    await this.writeStatus(state, state.statusCode, toId, actorId, { reason: cleanReason });
    this.notifyChanged(organisationId);
    return { organisationId, fromStatus: current, toStatus: to };
  }

  /**
   * Checklist write with optimistic concurrency: applies only if the row is
   * still at `expectedVersion`, and writes the status-log row in the same
   * statement when the status changes. Returns false on a version conflict.
   */
  async commitProgress(input: ProgressCommit): Promise<boolean> {
    const statusChanged = input.toStatusId !== input.state.statusCode;
    const stepId = input.stepCode ? await this.typeDefs.id("onboarding_step_code", input.stepCode) : null;
    const result = await this.db.execute(sql`
      WITH upd AS (
        UPDATE organisation_onboarding_states
        SET completed_step_codes = ${JSON.stringify(input.completed)}::jsonb,
            skipped_step_codes = ${JSON.stringify(input.skipped)}::jsonb,
            current_step_code = ${input.currentStepId},
            launch_route_code = ${input.launchRouteId},
            status_code = ${input.toStatusId},
            golive_approved_at = CASE WHEN ${input.goliveApprovedBy !== null} THEN NOW() ELSE golive_approved_at END,
            golive_approved_by = COALESCE(${input.goliveApprovedBy}::uuid, golive_approved_by),
            version = version + 1
        WHERE id = ${input.state.id} AND version = ${input.expectedVersion}
        RETURNING id, organisation_id
      ), log AS (
        INSERT INTO organisation_onboarding_status_log
          (id, organisation_id, state_id, from_status_code, to_status_code, step_code, actor_id, reason, occurred_at)
        SELECT ${randomUUID()}::uuid, organisation_id, id, ${input.state.statusCode}::uuid, ${input.toStatusId}::uuid,
               ${stepId}::uuid, ${input.actorId}::uuid, NULL, NOW()
        FROM upd
        WHERE ${statusChanged}
        RETURNING id
      )
      SELECT (SELECT count(*) FROM upd)::int AS updated
    `);
    const updated = Number((result.rows[0] as { updated?: number } | undefined)?.updated ?? 0) > 0;
    if (updated) this.notifyChanged(input.state.organisationId);
    return updated;
  }

  async appendLog(entry: OnboardingLogEntry): Promise<void> {
    await this.db.insert(organisationOnboardingStatusLog).values(await this.logValues(entry));
  }

  /** Builds a status-log insert so callers can batch it with their own state update. */
  async logValues(entry: OnboardingLogEntry) {
    const stepId = entry.stepCode ? await this.typeDefs.id("onboarding_step_code", entry.stepCode) : null;
    return {
      id: randomUUID(),
      organisationId: entry.organisationId,
      stateId: entry.stateId,
      fromStatusCode: entry.fromStatusId,
      toStatusCode: entry.toStatusId,
      stepCode: stepId,
      actorId: entry.actorId,
      reason: entry.reason ?? null,
      occurredAt: new Date(),
    };
  }

  assert(from: OnboardingStatus | null, to: OnboardingStatus, mode: TransitionMode): void {
    try {
      assertTransition(from, to, mode);
    } catch (error) {
      if (error instanceof IllegalOnboardingTransitionError) {
        throw new ConflictException(`Onboarding cannot move from ${from ?? "none"} to ${to}`);
      }
      throw error;
    }
  }

  private async requireState(organisationId: string): Promise<OnboardingStateRow> {
    const state = await this.getState(organisationId);
    if (state) return state;
    const org = await this.db.query.organisations.findFirst({ where: eq(organisations.id, organisationId) });
    if (!org) throw new NotFoundException("Organisation not found");
    throw new BadRequestException("Onboarding state missing for this organisation");
  }

  private requireReason(reason: string | undefined): string {
    const trimmed = reason?.trim() ?? "";
    if (trimmed.length < 5) {
      throw new BadRequestException("A reason of at least 5 characters is required");
    }
    return trimmed.slice(0, 1000);
  }

  private async createState(
    organisationId: string,
    status: OnboardingStatus,
    actorId: string | null,
    stepCode?: string,
  ): Promise<void> {
    const id = randomUUID();
    const statusId = await this.typeDefs.id("organisation_onboarding_status", status);
    const stepId = stepCode ? await this.typeDefs.id("onboarding_step_code", stepCode) : null;
    const log = await this.logValues({
      organisationId,
      stateId: id,
      fromStatusId: null,
      toStatusId: statusId,
      actorId,
      stepCode,
    });
    await this.db.batch([
      this.db.insert(organisationOnboardingStates).values({
        id,
        organisationId,
        statusCode: statusId,
        currentStepCode: stepId,
        completedStepCodes: [],
      }),
      this.db.insert(organisationOnboardingStatusLog).values(log),
    ]);
    this.notifyChanged(organisationId);
  }

  private async writeStatus(
    state: OnboardingStateRow,
    fromStatusId: string,
    toStatusId: string,
    actorId: string | null,
    options: { stepCode?: string; reason?: string; patch?: Partial<OnboardingStateRow> },
  ): Promise<void> {
    const log = await this.logValues({
      organisationId: state.organisationId,
      stateId: state.id,
      fromStatusId,
      toStatusId,
      actorId,
      stepCode: options.stepCode,
      reason: options.reason,
    });
    await this.db.batch([
      this.db
        .update(organisationOnboardingStates)
        .set({
          ...(options.patch ?? {}),
          statusCode: toStatusId,
          version: sql`${organisationOnboardingStates.version} + 1`,
        })
        .where(eq(organisationOnboardingStates.id, state.id)),
      this.db.insert(organisationOnboardingStatusLog).values(log),
    ]);
  }
}
