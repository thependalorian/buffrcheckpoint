import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { authenticator } from "otplib";
import { createHash, randomBytes, randomUUID } from "node:crypto";

import { ScopedPermissionEvaluationService } from "../../common/access-control/scoped-permission-evaluation.service";
import {
  decryptSecret,
  encryptSecret,
  generateOpaqueToken,
  hashOpaqueToken,
  normalizeTotpCode,
} from "../../common/crypto/secret-crypto";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  emailVerificationTokens,
  mfaChallengeTokens,
  mfaRecoveryCodes,
  organisationMemberships,
  organisationOnboardingStates,
  organisationOnboardingStatusLog,
  organisations,
  passwordResetTokens,
  platformSupportSession,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ONBOARDING_STEPS, REQUIRED_BEFORE_GOLIVE, type OnboardingStepCode } from "../onboarding/onboarding-steps";
import type { ConfirmPasswordResetDto, RequestPasswordResetDto } from "./dto/password-reset.dto";
import { OnboardingEvidenceService } from "./onboarding-evidence.service";

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_MAX_PER_HOUR = 3;
const EMAIL_VERIFICATION_TTL_MS = Number(process.env.EMAIL_VERIFICATION_TTL_MS ?? 24 * 60 * 60 * 1000);
const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000;
/** Failed passwords within this window count toward lockout. */
const LOGIN_FAILURE_WINDOW_MS = 5 * 60 * 1000;
/** Lock after this many failed passwords in the window. */
const LOGIN_FAILURE_THRESHOLD = 3;
/** Cooldown duration after threshold is hit. */
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;

authenticator.options = { window: 1 };

export interface AccessTokenResult {
  accessToken: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  onboardingComplete: boolean;
  nextPath: string;
}

export interface LoginResult {
  accessToken?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  onboardingComplete?: boolean;
  nextPath?: string;
  mfaRequired?: boolean;
  mfaChallengeToken?: string;
  emailVerificationRequired?: boolean;
}

export interface RegisterInput {
  organisationId: string;
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly permissionEvaluation: ScopedPermissionEvaluationService,
    private readonly notifications: NotificationsService,
    private readonly onboardingEvidence: OnboardingEvidenceService,
  ) {}

  async register(dto: RegisterInput): Promise<{ ok: true; email: string; emailVerificationRequired: true }> {
    const existing = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.organisationId, dto.organisationId), eq(applicationUsers.email, dto.email)),
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists for this organisation");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const userId = randomUUID();

    await this.db.insert(applicationUsers).values({
      id: userId,
      organisationId: dto.organisationId,
      email: dto.email,
      passwordHash,
      emailVerifiedAt: null,
      mfaEnabled: false,
    });

    const ownerOperatorRoleCodeId = await this.typeDefs.id("role_code", "owner_operator");
    const existingRole = await this.db.query.roleDefinitions.findFirst({
      where: and(
        eq(roleDefinitions.organisationId, dto.organisationId),
        eq(roleDefinitions.roleCode, ownerOperatorRoleCodeId),
        isNull(roleDefinitions.deletedAt),
      ),
    });

    const ownerOperatorRoleId = existingRole?.id ?? randomUUID();
    if (!existingRole) {
      await this.db.insert(roleDefinitions).values({
        id: ownerOperatorRoleId,
        organisationId: dto.organisationId,
        roleCode: ownerOperatorRoleCodeId,
        roleLabel: "Owner-Operator",
        isSystemRole: true,
      });
    }

    const initialAssignmentType = await this.typeDefs.id("role_assignment_event_type", "initial");
    await this.db.insert(organisationMemberships).values({
      id: randomUUID(),
      organisationId: dto.organisationId,
      userId,
      roleId: ownerOperatorRoleId,
      assignmentEventTypeCode: initialAssignmentType,
    });

    await this.issueEmailVerification(userId, dto.organisationId, dto.email);

    return { ok: true, email: dto.email, emailVerificationRequired: true };
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, email), isNull(applicationUsers.deletedAt)),
    });

    if (user) {
      this.assertNotLocked(user.lockedUntil);
    }

    const passwordOk =
      !!user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !passwordOk) {
      if (user) {
        const lockedUntil = await this.recordFailedLogin(user);
        if (lockedUntil) {
          this.assertNotLocked(lockedUntil);
        }
      }
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.clearLoginLockout(user.id);

    if (!user.emailVerifiedAt) {
      return { emailVerificationRequired: true };
    }

    const { roleCode } = await this.resolveSessionRole(user.id);
    if (!roleCode) {
      throw new UnauthorizedException("Account has no role assignment — contact your administrator");
    }

    if (user.mfaEnabled) {
      const challenge = await this.createMfaChallenge(user.id, user.organisationId);
      return { mfaRequired: true, mfaChallengeToken: challenge };
    }

    return this.issueFullSession(user.id, user.organisationId, roleCode, true, false);
  }

  async verifyEmail(rawToken: string): Promise<AccessTokenResult> {
    const tokenHash = hashOpaqueToken(rawToken, "EMAIL_VERIFICATION_PEPPER");
    const candidate = await this.db.query.emailVerificationTokens.findFirst({
      where: and(eq(emailVerificationTokens.tokenHash, tokenHash), isNull(emailVerificationTokens.consumedAt)),
    });

    if (!candidate || candidate.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired verification link");
    }

    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.id, candidate.userId), isNull(applicationUsers.deletedAt)),
    });
    if (!user) {
      throw new UnauthorizedException("Invalid or expired verification link");
    }

    await this.db
      .update(applicationUsers)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(applicationUsers.id, user.id));
    await this.db
      .update(emailVerificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(emailVerificationTokens.id, candidate.id));

    await this.transitionOnboardingStatus(user.organisationId, "email_verified", user.id, "organisation_profile");

    const { roleCode } = await this.resolveSessionRole(user.id);

    return this.issueFullSession(
      user.id,
      user.organisationId,
      roleCode ?? "owner_operator",
      true,
      user.mfaEnabled,
    );
  }

  async resendEmailVerification(email: string): Promise<{ ok: true }> {
    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, email), isNull(applicationUsers.deletedAt)),
    });
    // Anti-enumeration: always succeed.
    if (!user || user.emailVerifiedAt) {
      return { ok: true };
    }
    await this.issueEmailVerification(user.id, user.organisationId, user.email);
    return { ok: true };
  }

  async issueEmailVerification(userId: string, organisationId: string, email: string): Promise<void> {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken, "EMAIL_VERIFICATION_PEPPER");
    await this.db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId,
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const verifyUrl = `${adminBase}/auth/verify-email?token=${rawToken}`;

    await this.notifications
      .sendForOrganisation({
        organisationId,
        channelCode: "email",
        recipientReference: email,
        subject: "Confirm your Buffr Checkpoint account",
        message: `Confirm your Buffr Checkpoint account by opening this link within 24 hours:\n\n${verifyUrl}\n\nIf you did not create this account, ignore this email.`,
        html: `<p>Confirm your Buffr Checkpoint account by clicking the link below within 24 hours.</p><p><a href="${verifyUrl}">Verify email address</a></p><p>If you did not create this account, ignore this email.</p>`,
      })
      .catch(() => undefined);
  }

  async startMfaEnrollment(user: AuthenticatedUser): Promise<{ otpauthUrl: string; secret: string }> {
    if (!user.emailVerified) {
      throw new UnauthorizedException("Verify your email before enrolling MFA");
    }

    const account = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.id, user.userId), eq(applicationUsers.organisationId, user.organisationId)),
    });
    if (!account) {
      throw new UnauthorizedException("Account not found");
    }
    if (account.mfaEnabled) {
      throw new BadRequestException("Authenticator MFA is already enabled for this account");
    }

    // Idempotent: remounts / React Strict Mode must not rotate the secret
    // after the user has already scanned the QR (otherwise confirm fails).
    let secret: string;
    if (account.mfaSecretReference) {
      try {
        secret = decryptSecret(account.mfaSecretReference);
      } catch {
        secret = authenticator.generateSecret();
        await this.db
          .update(applicationUsers)
          .set({ mfaSecretReference: encryptSecret(secret), mfaEnabled: false })
          .where(eq(applicationUsers.id, user.userId));
      }
    } else {
      secret = authenticator.generateSecret();
      await this.db
        .update(applicationUsers)
        .set({ mfaSecretReference: encryptSecret(secret), mfaEnabled: false })
        .where(eq(applicationUsers.id, user.userId));
    }

    const otpauthUrl = authenticator.keyuri(account.email, "Buffr Checkpoint", secret);
    return { otpauthUrl, secret };
  }

  async confirmMfaEnrollment(
    user: AuthenticatedUser,
    rawCode: string,
  ): Promise<{ recoveryCodes: string[]; nextPath: string; accessToken: string }> {
    const code = normalizeTotpCode(rawCode);
    const account = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.id, user.userId), eq(applicationUsers.organisationId, user.organisationId)),
    });
    if (!account?.mfaSecretReference) {
      throw new BadRequestException("Start MFA enrollment before confirming");
    }
    const secret = decryptSecret(account.mfaSecretReference);
    if (!authenticator.check(code, secret)) {
      throw new UnauthorizedException("Invalid authenticator code");
    }

    const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(5).toString("hex"));
    await this.db
      .update(mfaRecoveryCodes)
      .set({ deletedAt: new Date() })
      .where(and(eq(mfaRecoveryCodes.userId, user.userId), isNull(mfaRecoveryCodes.deletedAt)));

    await this.db.insert(mfaRecoveryCodes).values(
      recoveryCodes.map((codeValue) => ({
        id: randomUUID(),
        organisationId: user.organisationId,
        userId: user.userId,
        codeHash: createHash("sha256").update(codeValue).digest("hex"),
      })),
    );

    await this.db
      .update(applicationUsers)
      .set({ mfaEnabled: true })
      .where(eq(applicationUsers.id, user.userId));

    await this.transitionOnboardingStatus(user.organisationId, "mfa_enrolled", user.userId, "organisation_profile");
    await this.transitionOnboardingStatus(user.organisationId, "in_progress", user.userId, "organisation_profile");

    const session = await this.issueFullSession(
      user.userId,
      user.organisationId,
      user.roleCode,
      true,
      true,
    );

    return { recoveryCodes, nextPath: session.nextPath, accessToken: session.accessToken };
  }

  async verifyMfaChallenge(challengeToken: string, rawCode: string, recoveryCode?: string): Promise<AccessTokenResult> {
    const tokenHash = hashOpaqueToken(challengeToken.trim(), "MFA_CHALLENGE_PEPPER");
    const challenge = await this.db.query.mfaChallengeTokens.findFirst({
      where: and(eq(mfaChallengeTokens.tokenHash, tokenHash), isNull(mfaChallengeTokens.consumedAt)),
    });
    if (!challenge) {
      throw new UnauthorizedException(
        "Invalid or expired MFA challenge. Sign in again to start a new authenticator check.",
      );
    }
    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "MFA challenge expired. Sign in again — authenticator checks are valid for 10 minutes.",
      );
    }

    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.id, challenge.userId), isNull(applicationUsers.deletedAt)),
    });
    if (!user?.mfaSecretReference || !user.mfaEnabled) {
      throw new UnauthorizedException(
        "Authenticator MFA is not active on this account. Complete MFA setup or contact an administrator.",
      );
    }

    let accepted = false;
    if (recoveryCode?.trim()) {
      const codeHash = createHash("sha256").update(recoveryCode.trim()).digest("hex");
      const recovery = await this.db.query.mfaRecoveryCodes.findFirst({
        where: and(
          eq(mfaRecoveryCodes.userId, user.id),
          eq(mfaRecoveryCodes.codeHash, codeHash),
          isNull(mfaRecoveryCodes.consumedAt),
          isNull(mfaRecoveryCodes.deletedAt),
        ),
      });
      if (recovery) {
        await this.db
          .update(mfaRecoveryCodes)
          .set({ consumedAt: new Date() })
          .where(eq(mfaRecoveryCodes.id, recovery.id));
        accepted = true;
      }
    } else {
      const secret = decryptSecret(user.mfaSecretReference);
      accepted = authenticator.check(normalizeTotpCode(rawCode), secret);
    }

    if (!accepted) {
      throw new UnauthorizedException("Invalid authenticator code");
    }

    await this.db
      .update(mfaChallengeTokens)
      .set({ consumedAt: new Date() })
      .where(eq(mfaChallengeTokens.id, challenge.id));

    const { roleCode } = await this.resolveSessionRole(user.id);

    return this.issueFullSession(
      user.id,
      user.organisationId,
      roleCode ?? "owner_operator",
      true,
      true,
    );
  }

  async me(authUser: AuthenticatedUser) {
    // Platform Ops Console support session: authUser.userId is the platform
    // user, authUser.organisationId is the *target* customer org they have
    // no membership row for (that's the point — see
    // support-sessions/support-sessions.service.ts). Skip the normal
    // membership/role lookup and answer directly from the session token's
    // own claims instead, so admin/ can still render correctly under it.
    if (authUser.supportSessionId) {
      const [orgRow, sessionRow] = await Promise.all([
        this.db.query.organisations.findFirst({ where: eq(organisations.id, authUser.organisationId) }),
        this.db.query.platformSupportSession.findFirst({ where: eq(platformSupportSession.id, authUser.supportSessionId) }),
      ]);
      if (!orgRow) throw new UnauthorizedException("Target organisation no longer exists");
      return {
        user: { id: authUser.userId, email: "platform-support", emailVerified: true, mfaEnabled: true },
        activeOrganisation: { id: orgRow.id, name: orgRow.legalName },
        memberships: [
          { organisationId: orgRow.id, organisationName: orgRow.legalName, roles: [authUser.roleCode], siteScopes: [] },
        ],
        permissions: authUser.permissions,
        supportSession: {
          sessionId: authUser.supportSessionId,
          grantId: authUser.supportGrantId,
          expiresAt: sessionRow?.expiresAt ?? null,
        },
        onboarding: { status: "live", currentStep: "complete", completedSteps: [], complete: true, nextPath: "/dashboard/default" },
      };
    }

    const [userRow, orgRow, memberships, onboarding] = await Promise.all([
      this.db.query.applicationUsers.findFirst({ where: eq(applicationUsers.id, authUser.userId) }),
      this.db.query.organisations.findFirst({ where: eq(organisations.id, authUser.organisationId) }),
      this.db.query.organisationMemberships.findMany({
        where: and(eq(organisationMemberships.userId, authUser.userId), isNull(organisationMemberships.deletedAt)),
      }),
      this.db.query.organisationOnboardingStates.findFirst({
        where: and(
          eq(organisationOnboardingStates.organisationId, authUser.organisationId),
          isNull(organisationOnboardingStates.deletedAt),
        ),
      }),
    ]);

    if (!userRow || !orgRow) {
      throw new UnauthorizedException("Account or organisation no longer exists");
    }

    const roleCodes = await Promise.all(
      memberships.map(async (membership): Promise<string | null> => {
        const roleRow = await this.db.query.roleDefinitions.findFirst({
          where: eq(roleDefinitions.id, membership.roleId),
        });
        if (!roleRow) return null;
        const roleCodeRow = await this.db.query.typeDefinition.findFirst({
          where: eq(typeDefinition.id, roleRow.roleCode),
        });
        return roleCodeRow?.code ?? null;
      }),
    );
    const roles = roleCodes.filter((code): code is string => code !== null);
    const siteScopeRows =
      memberships.length === 0
        ? []
        : await this.db.query.membershipScopes.findMany({
            where: (scope, { inArray }) =>
              inArray(
                scope.membershipId,
                memberships.map((m) => m.id),
              ),
          });
    const siteScopes = siteScopeRows.map((scope) => scope.scopeId).filter((id): id is string => id !== null);
    const permissionSets = await Promise.all(
      roles.map((code) => this.permissionEvaluation.permissionsForRoleCode(code)),
    );
    const permissions = Array.from(new Set(permissionSets.flatMap((set) => Array.from(set))));

    const statusRow = onboarding
      ? await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, onboarding.statusCode) })
      : null;
    const stepRow = onboarding?.currentStepCode
      ? await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, onboarding.currentStepCode) })
      : null;

    const onboardingComplete = statusRow?.code === "live";
    const nextPath = this.resolveNextPath(userRow.emailVerifiedAt !== null, userRow.mfaEnabled, statusRow?.code, stepRow?.code);

    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        emailVerified: userRow.emailVerifiedAt !== null,
        mfaEnabled: userRow.mfaEnabled,
      },
      activeOrganisation: { id: orgRow.id, name: orgRow.legalName },
      memberships: [
        {
          organisationId: orgRow.id,
          organisationName: orgRow.legalName,
          roles,
          siteScopes,
        },
      ],
      permissions,
      onboarding: {
        status: statusRow?.code ?? "pending_email_verification",
        currentStep: stepRow?.code ?? "organisation_profile",
        completedSteps: (onboarding?.completedStepCodes as string[] | undefined) ?? [],
        complete: onboardingComplete,
        nextPath,
      },
    };
  }

  async getOnboardingStatus(user: AuthenticatedUser) {
    const me = await this.me(user);
    return me.onboarding;
  }

  async getOnboardingEvidence(user: AuthenticatedUser, stepCode: OnboardingStepCode) {
    if (!ONBOARDING_STEPS.includes(stepCode)) {
      throw new BadRequestException("Unknown onboarding step");
    }
    const missingEvidence = await this.onboardingEvidence.evaluate(user, stepCode);
    return { step: stepCode, missingEvidence, satisfied: missingEvidence.length === 0 };
  }

  async completeOnboardingStep(user: AuthenticatedUser, stepCode: OnboardingStepCode) {
    if (!ONBOARDING_STEPS.includes(stepCode)) {
      throw new BadRequestException("Unknown onboarding step");
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException("Verify your email before continuing onboarding");
    }
    const account = await this.db.query.applicationUsers.findFirst({
      where: eq(applicationUsers.id, user.userId),
    });
    if (!account?.mfaEnabled && stepCode !== "organisation_profile") {
      throw new UnauthorizedException("Enroll MFA before continuing onboarding");
    }

    const state = await this.db.query.organisationOnboardingStates.findFirst({
      where: and(
        eq(organisationOnboardingStates.organisationId, user.organisationId),
        isNull(organisationOnboardingStates.deletedAt),
      ),
    });
    if (!state) {
      throw new BadRequestException("Onboarding state missing");
    }

    await this.onboardingEvidence.assertSatisfied(user, stepCode);

    const completed = new Set((state.completedStepCodes as string[] | null) ?? []);
    if (stepCode === "golive_approval") {
      const missingPrior = REQUIRED_BEFORE_GOLIVE.filter((step) => !completed.has(step));
      if (missingPrior.length > 0) {
        throw new BadRequestException({
          message: "Onboarding evidence incomplete",
          missingEvidence: missingPrior.map((step) => `step.${step}`),
        });
      }
    }
    completed.add(stepCode);

    const stepIndex = ONBOARDING_STEPS.indexOf(stepCode);
    const nextStep = ONBOARDING_STEPS[Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1)];
    const nextStepId = await this.typeDefs.id("onboarding_step_code", nextStep);

    const requiredDone = REQUIRED_BEFORE_GOLIVE.every((step) => completed.has(step));
    let statusCode = state.statusCode;
    if (stepCode === "golive_approval") {
      if (!requiredDone || !account?.mfaEnabled) {
        throw new BadRequestException("Complete required onboarding steps and MFA before go-live approval");
      }
      statusCode = await this.typeDefs.id("organisation_onboarding_status", "live");
      await this.db
        .update(organisationOnboardingStates)
        .set({
          completedStepCodes: Array.from(completed),
          currentStepCode: nextStepId,
          statusCode,
          goliveApprovedAt: new Date(),
          goliveApprovedBy: user.userId,
        })
        .where(eq(organisationOnboardingStates.id, state.id));
      await this.appendOnboardingLog(user.organisationId, state.id, state.statusCode, statusCode, user.userId, stepCode);
    } else {
      if (requiredDone) {
        statusCode = await this.typeDefs.id("organisation_onboarding_status", "ready_for_golive");
      } else {
        statusCode = await this.typeDefs.id("organisation_onboarding_status", "in_progress");
      }
      await this.db
        .update(organisationOnboardingStates)
        .set({
          completedStepCodes: Array.from(completed),
          currentStepCode: nextStepId,
          statusCode,
        })
        .where(eq(organisationOnboardingStates.id, state.id));
      if (statusCode !== state.statusCode) {
        await this.appendOnboardingLog(user.organisationId, state.id, state.statusCode, statusCode, user.userId, stepCode);
      }
    }

    return this.getOnboardingStatus(user);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{ tokenIssued: boolean }> {
    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, dto.email), isNull(applicationUsers.deletedAt)),
    });

    // Always return the same shape — do not reveal whether the email exists.
    if (!user) {
      return { tokenIssued: true };
    }

    const recentResets = await this.db.query.passwordResetTokens.findMany({
      where: and(
        eq(passwordResetTokens.userId, user.id),
        gt(passwordResetTokens.expiresAt, new Date(Date.now() - PASSWORD_RESET_TTL_MS)),
      ),
    });
    // Cap email blast: at most N reset mails per rolling hour (tokens last 1h).
    if (recentResets.length >= PASSWORD_RESET_MAX_PER_HOUR) {
      return { tokenIssued: true };
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await this.db.insert(passwordResetTokens).values({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });

    const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    await this.notifications
      .sendForOrganisation({
        organisationId: user.organisationId,
        channelCode: "email",
        recipientReference: user.email,
        subject: "Reset your Buffr Checkpoint password",
        message: `Password reset requested. Open: ${adminBase}/auth/reset-password?token=${rawToken}`,
      })
      .catch(() => undefined);

    return { tokenIssued: true };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{ success: boolean }> {
    const tokenHash = createHash("sha256").update(dto.token).digest("hex");
    const candidate = await this.db.query.passwordResetTokens.findFirst({
      where: and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.consumedAt)),
    });

    if (!candidate || candidate.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired password reset token");
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.db
      .update(applicationUsers)
      .set({
        passwordHash: newHash,
        failedLoginCount: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      })
      .where(eq(applicationUsers.id, candidate.userId));
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, candidate.id));

    return { success: true };
  }

  private assertNotLocked(lockedUntil: Date | null | undefined): void {
    if (!lockedUntil) return;
    const remainingMs = lockedUntil.getTime() - Date.now();
    if (remainingMs <= 0) return;
    const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          "Too many failed sign-in attempts. Wait a few minutes or reset your password, then try again.",
        retryAfterSeconds,
        error: "Too Many Requests",
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async recordFailedLogin(user: {
    id: string;
    organisationId: string;
    email: string;
    failedLoginCount: number;
    lastFailedLoginAt: Date | null;
    lockedUntil: Date | null;
  }): Promise<Date | null> {
    const now = Date.now();
    const lastFailed = user.lastFailedLoginAt?.getTime() ?? 0;
    const inWindow = lastFailed > 0 && now - lastFailed <= LOGIN_FAILURE_WINDOW_MS;
    const nextCount = inWindow ? user.failedLoginCount + 1 : 1;
    const shouldLock = nextCount >= LOGIN_FAILURE_THRESHOLD;
    const lockedUntil = shouldLock ? new Date(now + LOGIN_LOCKOUT_MS) : null;

    await this.db
      .update(applicationUsers)
      .set({
        failedLoginCount: nextCount,
        lastFailedLoginAt: new Date(now),
        lockedUntil,
      })
      .where(eq(applicationUsers.id, user.id));

    if (shouldLock) {
      const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
      await this.notifications
        .sendForOrganisation({
          organisationId: user.organisationId,
          channelCode: "email",
          recipientReference: user.email,
          subject: "Buffr Checkpoint sign-in temporarily locked",
          message: [
            "Someone tried to sign in to your Buffr Checkpoint account with the wrong password several times.",
            `Your account is locked for about ${Math.round(LOGIN_LOCKOUT_MS / 60_000)} minutes.`,
            `If this was not you, reset your password: ${adminBase}/auth/forgot-password`,
            `Time (UTC): ${new Date(now).toISOString()}`,
          ].join("\n\n"),
        })
        .catch(() => undefined);
    }

    return lockedUntil;
  }

  private async clearLoginLockout(userId: string): Promise<void> {
    await this.db
      .update(applicationUsers)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      })
      .where(eq(applicationUsers.id, userId));
  }

  private async createMfaChallenge(userId: string, organisationId: string): Promise<string> {
    const raw = generateOpaqueToken();
    await this.db.insert(mfaChallengeTokens).values({
      id: randomUUID(),
      organisationId,
      userId,
      tokenHash: hashOpaqueToken(raw, "MFA_CHALLENGE_PEPPER"),
      expiresAt: new Date(Date.now() + MFA_CHALLENGE_TTL_MS),
    });
    return raw;
  }

  /**
   * Prefer platform_support when a user has multiple memberships so Buffr
   * staff logging into ops.buffrcheckpoint.com get the internal JWT role,
   * not a leftover customer owner_operator row.
   */
  private async resolveSessionRole(userId: string): Promise<{ roleCode: string | null; membershipId: string | null }> {
    const memberships = await this.db.query.organisationMemberships.findMany({
      where: and(eq(organisationMemberships.userId, userId), isNull(organisationMemberships.deletedAt)),
    });
    if (memberships.length === 0) return { roleCode: null, membershipId: null };

    const resolved = await Promise.all(
      memberships.map(async (membership) => {
        const roleRow = await this.db.query.roleDefinitions.findFirst({
          where: eq(roleDefinitions.id, membership.roleId),
        });
        if (!roleRow) return null;
        const roleCodeRow = await this.db.query.typeDefinition.findFirst({
          where: eq(typeDefinition.id, roleRow.roleCode),
        });
        return {
          membershipId: membership.id,
          roleCode: roleCodeRow?.code ?? null,
        };
      }),
    );
    const usable = resolved.filter((row): row is { membershipId: string; roleCode: string } => !!row?.roleCode);
    const platform = usable.find((row) => row.roleCode === "platform_support");
    const chosen = platform ?? usable[0];
    return chosen ? { roleCode: chosen.roleCode, membershipId: chosen.membershipId } : { roleCode: null, membershipId: null };
  }

  private async issueFullSession(
    userId: string,
    organisationId: string,
    roleCode: string,
    emailVerified: boolean,
    mfaEnabled: boolean,
  ): Promise<AccessTokenResult> {
    // Ops Console health-score signal ("admin login recency") — every
    // successful login path (password-only, post-MFA-challenge) converges
    // here, so this is the one place to record it.
    await this.db.update(applicationUsers).set({ lastLoginAt: new Date() }).where(eq(applicationUsers.id, userId));

    const onboarding = await this.db.query.organisationOnboardingStates.findFirst({
      where: and(
        eq(organisationOnboardingStates.organisationId, organisationId),
        isNull(organisationOnboardingStates.deletedAt),
      ),
    });
    const statusRow = onboarding
      ? await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, onboarding.statusCode) })
      : null;
    const stepRow = onboarding?.currentStepCode
      ? await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, onboarding.currentStepCode) })
      : null;
    const onboardingComplete = statusRow?.code === "live";
    const nextPath = this.resolveNextPath(emailVerified, mfaEnabled, statusRow?.code, stepRow?.code);

    const permissions = Array.from(await this.permissionEvaluation.permissionsForRoleCode(roleCode));
    const accessToken = this.jwt.sign({
      sub: userId,
      organisationId,
      siteId: null,
      roleCode,
      permissions,
      emailVerified,
      mfaEnabled,
    });
    return { accessToken, emailVerified, mfaEnabled, onboardingComplete, nextPath };
  }

  resolveNextPath(
    emailVerified: boolean,
    mfaEnabled: boolean,
    statusCode?: string | null,
    stepCode?: string | null,
  ): string {
    if (!emailVerified) return "/auth/check-email";
    if (!mfaEnabled) return "/auth/mfa/setup";
    if (statusCode === "live") return "/dashboard/default";
    if (stepCode) return `/onboarding/${stepCode.replace(/_/g, "-")}`;
    return "/onboarding/organisation-profile";
  }

  async transitionOnboardingStatus(
    organisationId: string,
    toStatus: string,
    actorId: string | null,
    stepCode?: string,
  ): Promise<void> {
    const state = await this.db.query.organisationOnboardingStates.findFirst({
      where: and(
        eq(organisationOnboardingStates.organisationId, organisationId),
        isNull(organisationOnboardingStates.deletedAt),
      ),
    });
    const toStatusId = await this.typeDefs.id("organisation_onboarding_status", toStatus);
    const stepId = stepCode ? await this.typeDefs.id("onboarding_step_code", stepCode) : null;

    if (!state) {
      const id = randomUUID();
      await this.db.insert(organisationOnboardingStates).values({
        id,
        organisationId,
        statusCode: toStatusId,
        currentStepCode: stepId,
        completedStepCodes: [],
      });
      await this.appendOnboardingLog(organisationId, id, null, toStatusId, actorId, stepCode);
      return;
    }

    await this.db
      .update(organisationOnboardingStates)
      .set({
        statusCode: toStatusId,
        ...(stepId ? { currentStepCode: stepId } : {}),
      })
      .where(eq(organisationOnboardingStates.id, state.id));
    await this.appendOnboardingLog(organisationId, state.id, state.statusCode, toStatusId, actorId, stepCode);
  }

  private async appendOnboardingLog(
    organisationId: string,
    stateId: string,
    fromStatusCode: string | null,
    toStatusCode: string,
    actorId: string | null,
    stepCode?: string,
  ): Promise<void> {
    const stepId = stepCode ? await this.typeDefs.id("onboarding_step_code", stepCode) : null;
    await this.db.insert(organisationOnboardingStatusLog).values({
      id: randomUUID(),
      organisationId,
      stateId,
      fromStatusCode,
      toStatusCode,
      stepCode: stepId,
      actorId,
      occurredAt: new Date(),
    });
  }
}
