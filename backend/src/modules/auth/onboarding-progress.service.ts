import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { LegalService } from "../legal/legal.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import {
  autoSteps,
  canSkipStep,
  currentStep,
  DEFAULT_LAUNCH_ROUTE,
  describeSteps,
  isLaunchRoute,
  isOnboardingStep,
  type LaunchRoute,
  missingBeforeGolive,
  type OnboardingStepCode,
  type ProgressInput,
  sanitizeStepList,
  stepRequirement,
} from "../onboarding/onboarding-steps";
import type { OnboardingStateRow } from "../onboarding-state/onboarding-state.service";
import { OnboardingStateService } from "../onboarding-state/onboarding-state.service";
import { OrganisationStandardsService } from "../organisation-standards/organisation-standards.service";
import { AuthService } from "./auth.service";
import {
  blockedBy,
  type EvidenceSnapshot,
  missingEvidence,
  OnboardingEvidenceService,
} from "./onboarding-evidence.service";
import { OnboardingPresenceService } from "./onboarding-presence.service";

const SETUP_CLOSED = new Set(["ready_for_golive", "live", "suspended"]);

interface Loaded {
  state: OnboardingStateRow;
  status: string | null;
  progress: ProgressInput;
}

type Change = (loaded: Loaded) => Promise<{
  completed: string[];
  skipped: string[];
  route: LaunchRoute | null;
  toStatus: string | null;
  goliveApprovedBy: string | null;
} | null>;

/**
 * Launch-readiness checklist writes. Completion is idempotent, the pointer is
 * always the first incomplete required step, and every write is applied with
 * optimistic concurrency (one retry, then 409).
 */
@Injectable()
export class OnboardingProgressService {
  private readonly logger = new Logger(OnboardingProgressService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly onboardingState: OnboardingStateService,
    private readonly evidence: OnboardingEvidenceService,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly auth: AuthService,
    private readonly templatedEmail: TemplatedEmailService,
    private readonly presence: OnboardingPresenceService,
    private readonly standards: OrganisationStandardsService,
    private readonly legal: LegalService,
  ) {}

  /**
   * Every step with its requirement, state, missing evidence and missing
   * prerequisites, plus who else is editing setup, for the readiness overview.
   */
  async readiness(user: AuthenticatedUser) {
    // Steps the system completes from defaults are brought up to date first, so the owner never sees one as a to-do that is done. The
    // sync already read the state and the evidence, so they are reused unless it wrote (then they are stale and read again).
    const synced = await this.syncAuto(user).catch((error) => {
      this.logger.warn(`onboarding auto-steps not synced: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    const loaded = synced && !synced.wrote ? synced.loaded : await this.load(user.organisationId);
    const facts =
      synced && !synced.wrote ? synced.facts : await this.evidence.snapshot(user.organisationId, user.userId);
    const steps = describeSteps(loaded.progress).map((step) => ({
      ...step,
      missingEvidence: missingEvidence(step.code, loaded.progress.route, facts),
      blockedBy: step.state === "done" ? [] : blockedBy(step.code, facts),
    }));
    return {
      status: loaded.status,
      startedAt: loaded.state.createdAt,
      launchRoute: loaded.progress.route,
      currentStep: currentStep(loaded.progress),
      missingBeforeGolive: missingBeforeGolive(loaded.progress),
      goLive: await this.goLiveBlock(user, facts),
      steps,
      editing: this.presence
        .others(user.organisationId, user.userId)
        .map(({ stepCode, email }) => ({ stepCode, email })),
    };
  }

  /**
   * Everything go-live depends on, in one place, so the owner sees it from the start instead of meeting it as a refusal at the
   * end: the plan, business verification (reviewed by hand by Buffr ops), the current agreements, the standards, the first test
   * arrival and the owner's launch acknowledgement.
   */
  private async goLiveBlock(user: AuthenticatedUser, facts: EvidenceSnapshot) {
    const [subscription, kyb, legal] = await Promise.all([
      this.auth.resolveSubscriptionEntitlement(user.organisationId),
      this.db.execute(sql`
        SELECT td.code AS status_code, v.submitted_at
        FROM organisation_kyb_verification v JOIN type_definition td ON td.id = v.status_code
        WHERE v.organisation_id = ${user.organisationId}
        ORDER BY v.submitted_at DESC LIMIT 1`),
      this.legal.status(user.organisationId),
    ]);
    const kybRow = kyb.rows[0] as { status_code?: string; submitted_at?: string | Date } | undefined;
    return {
      subscription: { status: subscription.status, operationalUseAllowed: subscription.operationalUseAllowed },
      // `none` until the owner submits; then pending, verified, rejected or expired as ops decide.
      kyb: {
        status: kybRow?.status_code ?? "none",
        submittedAt: kybRow?.submitted_at ? new Date(kybRow.submitted_at).toISOString() : null,
      },
      legalPending: legal.pending,
      standardsAccepted: facts.standardsAccepted,
      testArrivalDone: facts.testVisit,
      launchAcknowledged: facts.trainingAcknowledged,
    };
  }

  /**
   * Completes the steps Checkpoint's defaults satisfy, and applies the default launch route. It only ever adds a completion when the
   * evidence for the step exists right now, so it cannot mark anything done that is not, and it stops once setup is closed.
   */
  async syncAutoSteps(user: AuthenticatedUser): Promise<void> {
    await this.syncAuto(user);
  }

  /** The sync, returning what it read so a caller that needs the same state does not read it again. */
  private async syncAuto(
    user: AuthenticatedUser,
  ): Promise<{ loaded: Loaded; facts: EvidenceSnapshot; wrote: boolean }> {
    const before = await this.load(user.organisationId);
    const facts = await this.evidence.snapshot(user.organisationId, user.userId);
    const unchanged = { loaded: before, facts, wrote: false };
    if (before.status && SETUP_CLOSED.has(before.status)) return unchanged;
    const route: LaunchRoute = before.progress.route ?? DEFAULT_LAUNCH_ROUTE;
    // The default route is applied for the owner as soon as a site exists, in the same write that completes the step, so that step is
    // satisfiable exactly when it is unblocked. Every other step needs its own evidence to exist right now.
    const ready = autoSteps(route).filter((step) =>
      step === "launch_route"
        ? blockedBy(step, facts).length === 0
        : missingEvidence(step, route, facts).length === 0 && blockedBy(step, facts).length === 0,
    );
    const alreadyDone = ready.every((step) => before.progress.completed.includes(step));
    if (ready.length === 0 || (alreadyDone && before.progress.route !== null)) return unchanged;

    await this.onboardingState.advanceIfEarlyStage(user.organisationId, "in_progress", user.userId, ready[0]);
    await this.commit(user, ready[0], async ({ status, progress }) => {
      const nextRoute = progress.route ?? (blockedBy("launch_route", facts).length === 0 ? DEFAULT_LAUNCH_ROUTE : null);
      const completed = ready.reduce((list, step) => union(list, step), [...progress.completed]);
      const skipped = progress.skipped.filter((code) => !ready.includes(code as OnboardingStepCode));
      const unchanged =
        completed.length === progress.completed.length &&
        skipped.length === progress.skipped.length &&
        nextRoute === progress.route;
      if (unchanged) return null;
      const after = { route: nextRoute, completed, skipped };
      const readyForGolive = status === "in_progress" && missingBeforeGolive(after).length === 0;
      return {
        completed,
        skipped,
        route: nextRoute,
        toStatus: readyForGolive ? "ready_for_golive" : null,
        goliveApprovedBy: null,
      };
    });
    return { loaded: before, facts, wrote: true };
  }

  /** What the owner is asked to accept: the visitor notice, the retention period and the check-in form, as they stand now. */
  async standardsSummary(user: AuthenticatedUser) {
    return this.standards.summary(user.organisationId);
  }

  /**
   * The owner accepts the organisation standards as they stand (Checkpoint's wording, or their own edits). Recorded in the audit chain
   * with a fingerprint of exactly what was accepted, then the review step completes. Can be done now or just before go-live.
   */
  async acceptStandards(user: AuthenticatedUser) {
    await this.standards.accept(user);
    return this.completeStep(user, "notices_retention");
  }

  /** Advisory heartbeat from a step page (§11.9.15.9); never blocks a write. */
  async heartbeat(user: AuthenticatedUser, step: string) {
    const stepCode = this.requireStep(step);
    const result = await this.db.execute(sql`
      SELECT email FROM application_users WHERE id = ${user.userId} AND deleted_at IS NULL
    `);
    const email = (result.rows[0] as { email?: string } | undefined)?.email;
    if (email) this.presence.heartbeat(user.organisationId, { stepCode, userId: user.userId, email });
    return {
      editing: this.presence
        .others(user.organisationId, user.userId)
        .map(({ stepCode: code, email: who }) => ({ stepCode: code, email: who })),
    };
  }

  async setLaunchRoute(user: AuthenticatedUser, route: string) {
    if (!isLaunchRoute(route)) throw new BadRequestException(`Unknown launch route '${route}'`);
    await this.evidence.assertUnblocked(user.organisationId, user.userId, "launch_route");
    const facts = await this.evidence.snapshot(user.organisationId, user.userId);
    await this.commit(user, "launch_route", async ({ status, progress }) => {
      if (progress.route === route && progress.completed.includes("launch_route")) return null;
      if (status && SETUP_CLOSED.has(status) && progress.route !== route) {
        throw new ConflictException({
          code: "ONBOARDING_SETUP_CLOSED",
          message: "The launch route cannot change after setup is complete. Ask Buffr support to reopen setup.",
        });
      }
      // A different route can need different evidence for a step that was already complete (a kiosk needs a kiosk configuration where a
      // QR-first site does not). A completion is only kept if it still holds under the new route, so go-live can never pass on
      // evidence that no longer applies.
      const stillHolds = progress.completed.filter((code) => {
        const step = code as OnboardingStepCode;
        if (!isOnboardingStep(step) || step === "launch_route") return true;
        const requirement = stepRequirement(step, route);
        if (requirement !== "required" && requirement !== "auto") return true;
        return missingEvidence(step, route, facts).length === 0;
      });
      return {
        completed: union(stillHolds, "launch_route"),
        skipped: progress.skipped.filter((code) => code !== "launch_route"),
        route,
        toStatus: null,
        goliveApprovedBy: null,
      };
    });
    return this.auth.getOnboardingStatus(user);
  }

  async completeStep(user: AuthenticatedUser, step: string) {
    const code = this.requireStep(step);
    // Go-live counts the system's steps too (including the launch acknowledgement the owner has just given), so bring them up to date.
    if (code === "golive_approval") await this.syncAutoSteps(user);
    // An organisation still in an activation stage enters setup on its first checklist write.
    await this.onboardingState.advanceIfEarlyStage(user.organisationId, "in_progress", user.userId, code);

    await this.commit(user, code, async ({ status, progress }) => {
      if (progress.completed.includes(code)) return null;
      if (stepRequirement(code, progress.route) === "not_applicable") {
        throw new BadRequestException({
          code: "ONBOARDING_STEP_NOT_APPLICABLE",
          message: "This step does not apply to the chosen launch route.",
        });
      }
      await this.evidence.assertUnblocked(user.organisationId, user.userId, code);
      await this.evidence.assertSatisfied(user.organisationId, user.userId, code, progress.route);

      const completed = union(progress.completed, code);
      const skipped = progress.skipped.filter((item) => item !== code);
      const after = { route: progress.route, completed, skipped };

      if (code === "golive_approval") {
        const missing = missingBeforeGolive(after);
        if (missing.length > 0) {
          throw new BadRequestException({
            code: "ONBOARDING_EVIDENCE_MISSING",
            message: "Complete the required steps before go-live approval",
            missingEvidence: missing.map((item) => `step.${item}`),
          });
        }
        // Go-live is the owner's commitment, so it needs the current Terms and Privacy Policy accepted.
        if (!(await this.legal.isCurrent(user.organisationId))) {
          throw new BadRequestException({
            code: "ONBOARDING_EVIDENCE_MISSING",
            message: "Accept the current Terms and Privacy Policy before go-live",
            missingEvidence: ["legal.current_versions"],
          });
        }
        await this.assertEntitled(user);
        return { completed, skipped, route: progress.route, toStatus: "live", goliveApprovedBy: user.userId };
      }

      const ready = status === "in_progress" && missingBeforeGolive(after).length === 0;
      return {
        completed,
        skipped,
        route: progress.route,
        toStatus: ready ? "ready_for_golive" : null,
        goliveApprovedBy: null,
      };
    });
    return this.auth.getOnboardingStatus(user);
  }

  async skipStep(user: AuthenticatedUser, step: string) {
    const code = this.requireStep(step);
    await this.commit(user, code, async ({ progress }) => {
      if (progress.completed.includes(code) || progress.skipped.includes(code)) return null;
      if (!canSkipStep(code, progress.route)) {
        throw new BadRequestException({
          code: "ONBOARDING_STEP_REQUIRED",
          message: "Required steps cannot be skipped.",
        });
      }
      return {
        completed: [...progress.completed],
        skipped: union(progress.skipped, code),
        route: progress.route,
        toStatus: null,
        goliveApprovedBy: null,
      };
    });
    this.logger.log(`onboarding_step_skipped org=${user.organisationId} step=${code} actor=${user.userId}`);
    return this.auth.getOnboardingStatus(user);
  }

  private async commit(user: AuthenticatedUser, stepCode: OnboardingStepCode, change: Change): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const loaded = await this.load(user.organisationId);
      const next = await change(loaded);
      if (!next) return;

      if (next.toStatus) {
        this.onboardingState.assert(loaded.status as never, next.toStatus as never, "forward");
      }
      const [toStatusId, currentStepId, launchRouteId] = await Promise.all([
        next.toStatus
          ? this.typeDefs.id("organisation_onboarding_status", next.toStatus)
          : Promise.resolve(loaded.state.statusCode),
        this.typeDefs.id("onboarding_step_code", currentStep(next)),
        next.route ? this.typeDefs.id("onboarding_launch_route", next.route) : Promise.resolve(null),
      ]);
      const applied = await this.onboardingState.commitProgress({
        state: loaded.state,
        expectedVersion: loaded.state.version,
        completed: next.completed,
        skipped: next.skipped,
        currentStepId,
        launchRouteId,
        toStatusId,
        actorId: user.userId,
        stepCode,
        goliveApprovedBy: next.goliveApprovedBy,
      });
      if (applied) {
        if (next.toStatus === "live") {
          this.logger.log(`onboarding_live org=${user.organisationId} actor=${user.userId}`);
        }
        return;
      }
    }
    const lastChange = await this.lastChange(user.organisationId);
    throw new ConflictException({
      code: "ONBOARDING_CONFLICT",
      message: "Setup was changed by someone else. Refresh and try again.",
      changedBy: lastChange?.email ?? null,
      changedAt: lastChange?.occurredAt ?? null,
    });
  }

  /**
   * Who last changed setup, for the human conflict notice (§11.9.15.9). Read
   * from the audit chain: every checklist write is audited with its actor,
   * while the status log only records status changes.
   */
  private async lastChange(organisationId: string): Promise<{ email: string; occurredAt: string } | null> {
    const result = await this.db.execute(sql`
      SELECT u.email, a.occurred_at
      FROM audit_events a
      JOIN application_users u ON u.id = a.actor_id
      WHERE a.organisation_id = ${organisationId}
        AND a.action_code LIKE 'organisation_onboarding.%'
      ORDER BY a.occurred_at DESC
      LIMIT 1
    `);
    const row = result.rows[0] as { email?: string; occurred_at?: string | Date } | undefined;
    if (!row?.email || !row.occurred_at) return null;
    return { email: row.email, occurredAt: new Date(row.occurred_at).toISOString() };
  }

  private async load(organisationId: string): Promise<Loaded> {
    const state = await this.onboardingState.getState(organisationId);
    if (!state) throw new BadRequestException("Onboarding state missing for this organisation");
    const routeCode = state.launchRouteCode ? await this.typeDefs.codeById(state.launchRouteCode) : null;
    return {
      state,
      status: await this.onboardingState.statusOf(state),
      progress: {
        route: isLaunchRoute(routeCode) ? routeCode : null,
        completed: sanitizeStepList(state.completedStepCodes),
        skipped: sanitizeStepList(state.skippedStepCodes),
      },
    };
  }

  private requireStep(step: string): OnboardingStepCode {
    if (!isOnboardingStep(step)) throw new BadRequestException("Unknown onboarding step");
    return step;
  }

  private async assertEntitled(user: AuthenticatedUser): Promise<void> {
    const entitlement = await this.auth.resolveSubscriptionEntitlement(user.organisationId);
    if (entitlement.operationalUseAllowed) return;

    const contact = await this.auth.billingContact(user);
    if (contact) {
      const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
      await this.templatedEmail.send({
        templateCode: "suspension_warning",
        organisationId: user.organisationId,
        to: contact.email,
        variables: { organisationName: contact.organisationName, billingUrl: `${adminBase}/dashboard/billing` },
        fallback: {
          subject: "Action needed: Buffr Checkpoint access may be limited",
          body: `The subscription for ${contact.organisationName} is not active or on trial.\n\nGo-live stays blocked until billing is settled. Billing: ${adminBase}/dashboard/billing`,
        },
      });
    }
    throw new ForbiddenException({
      code: "SUBSCRIPTION_REQUIRED",
      message:
        "Go-live requires an active or trial subscription. Pay by EFT, upload proof of payment under Billing, and wait for Buffr ops to activate, or ask ops for a design-partner trial.",
    });
  }
}

function union(list: readonly string[], code: string): string[] {
  return list.includes(code) ? [...list] : [...list, code];
}
