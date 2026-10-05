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
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { authenticator } from "otplib";

import { ScopedPermissionEvaluationService } from "../../common/access-control/scoped-permission-evaluation.service";
import { ADMIN_SESSION_TTL, OPS_ENROLL_TTL, OPS_SESSION_TTL } from "../../common/auth/session-audience";
import { sessionCache } from "../../common/auth/session-cache";
import {
  decryptSecret,
  encryptSecret,
  generateOpaqueToken,
  hashOpaqueToken,
  normalizeTotpCode,
} from "../../common/crypto/secret-crypto";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  emailVerificationTokens,
  membershipScopes,
  mfaChallengeTokens,
  mfaRecoveryCodes,
  organisationMemberships,
  organisationOnboardingStates,
  organisationSubscription,
  organisations,
  passwordResetTokens,
  platformSupportSession,
  roleDefinitions,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import {
  currentStep,
  describeSteps,
  isLaunchRoute,
  missingBeforeGolive,
  sanitizeStepList,
} from "../onboarding/onboarding-steps";
import { OnboardingStateService } from "../onboarding-state/onboarding-state.service";
import { RbacService } from "../rbac/rbac.service";
import type { ConfirmPasswordResetDto, RequestPasswordResetDto } from "./dto/password-reset.dto";
import { createHash, randomBytes, randomUUID } from "node:crypto";

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
  /** Ops login only: staff account has no MFA yet; enrollmentToken may only enrol MFA. */
  mfaEnrollmentRequired?: boolean;
  enrollmentToken?: string;
}

const PLATFORM_ROLE = "platform_support";
const INVALID_CREDENTIALS = "Invalid email or password";

export interface RegisterInput {
  organisationId: string;
  email: string;
  password: string;
  roleCode?: string;
  siteId?: string;
}

const VERIFY_EMAIL_REPLAY_GRACE_MS = 60_000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly permissionEvaluation: ScopedPermissionEvaluationService,
    private readonly templatedEmail: TemplatedEmailService,
    private readonly rbac: RbacService,
    private readonly onboardingState: OnboardingStateService,
  ) {}

  async register(dto: RegisterInput): Promise<{ ok: true; email: string; emailVerificationRequired: true }> {
    const existing = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.organisationId, dto.organisationId), eq(applicationUsers.email, dto.email)),
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists for this organisation");
    }

    const roleCode = dto.roleCode?.trim() || "owner_operator";
    this.rbac.assertAssignableRoleCode(roleCode);
    const targetRole = await this.rbac.resolveRoleDefinition(dto.organisationId, roleCode);

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

    const initialAssignmentType = await this.typeDefs.id("role_assignment_event_type", "initial");
    const membershipId = randomUUID();
    await this.db.insert(organisationMemberships).values({
      id: membershipId,
      organisationId: dto.organisationId,
      userId,
      roleId: targetRole.id,
      assignmentEventTypeCode: initialAssignmentType,
    });

    if (dto.siteId) {
      await this.db.insert(membershipScopes).values({
        id: randomUUID(),
        membershipId,
        scopeType: "site",
        scopeId: dto.siteId,
      });
    }

    await this.issueEmailVerification(userId, dto.organisationId, dto.email);

    return { ok: true, email: dto.email, emailVerificationRequired: true };
  }

  /** Customer admin / kiosk login. Platform staff are refused here; they use platformLogin. */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.checkCredentials(email, password);
    if (!user.emailVerifiedAt) {
      return { emailVerificationRequired: true };
    }

    const { roleCode } = await this.resolveSessionRole(user.id);
    if (!roleCode) {
      throw new UnauthorizedException("Account has no role assignment — contact your administrator");
    }
    if (roleCode === PLATFORM_ROLE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.mfaEnabled) {
      const challenge = await this.createMfaChallenge(user.id, user.organisationId);
      return { mfaRequired: true, mfaChallengeToken: challenge };
    }

    return this.issueFullSession(user.id, user.organisationId, roleCode, true, false);
  }

  /**
   * Platform Ops Console login (buffrcheckpoint.md §9.2a). Only platform_support accounts;
   * everyone else gets the same error as a wrong password. MFA is mandatory: an account
   * without it receives a 15-minute token that can only enrol MFA.
   */
  async platformLogin(email: string, password: string): Promise<LoginResult> {
    const user = await this.checkCredentials(email, password);
    const { roleCode } = await this.resolveSessionRole(user.id);
    if (roleCode !== PLATFORM_ROLE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!user.emailVerifiedAt) {
      return { emailVerificationRequired: true };
    }
    if (user.mfaEnabled) {
      const challenge = await this.createMfaChallenge(user.id, user.organisationId);
      return { mfaRequired: true, mfaChallengeToken: challenge };
    }
    const permissions = Array.from(await this.permissionEvaluation.permissionsForRoleCode(PLATFORM_ROLE));
    const enrollmentToken = this.jwt.sign(
      {
        sub: user.id,
        organisationId: user.organisationId,
        siteId: null,
        roleCode: PLATFORM_ROLE,
        permissions,
        emailVerified: true,
        mfaEnabled: false,
        aud: "ops_enroll",
      },
      { expiresIn: OPS_ENROLL_TTL },
    );
    return { mfaEnrollmentRequired: true, enrollmentToken };
  }

  /** Password check shared by both front doors, including lockout bookkeeping. */
  private async checkCredentials(email: string, password: string) {
    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, email), isNull(applicationUsers.deletedAt)),
    });

    if (user) {
      this.assertNotLocked(user.lockedUntil);
    }

    const passwordOk = !!user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !passwordOk) {
      if (user) {
        const lockedUntil = await this.recordFailedLogin(user);
        if (lockedUntil) {
          this.assertNotLocked(lockedUntil);
        }
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.clearLoginLockout(user.id);
    return user;
  }

  async verifyEmail(rawToken: string): Promise<AccessTokenResult> {
    const tokenHash = hashOpaqueToken(rawToken, "EMAIL_VERIFICATION_PEPPER");
    const candidate = await this.db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.tokenHash, tokenHash),
    });
    const now = new Date();
    // A link opened twice (mail scanners, double clicks) within the grace
    // window still signs the same user in instead of showing "expired".
    const consumedAt = candidate?.consumedAt ?? null;
    const replay = consumedAt !== null;
    if (
      !candidate ||
      candidate.expiresAt < now ||
      (consumedAt && now.getTime() - consumedAt.getTime() > VERIFY_EMAIL_REPLAY_GRACE_MS)
    ) {
      throw new UnauthorizedException("Invalid or expired verification link");
    }

    const user = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.id, candidate.userId), isNull(applicationUsers.deletedAt)),
    });
    if (!user) {
      throw new UnauthorizedException("Invalid or expired verification link");
    }

    if (!replay) {
      await this.db.update(applicationUsers).set({ emailVerifiedAt: now }).where(eq(applicationUsers.id, user.id));
      await this.db
        .update(emailVerificationTokens)
        .set({ consumedAt: now })
        .where(and(eq(emailVerificationTokens.id, candidate.id), isNull(emailVerificationTokens.consumedAt)));
      sessionCache.invalidateUser(user.id);
      await this.onboardingState.advanceIfEarlyStage(user.organisationId, "email_verified", user.id);
    }

    const { roleCode } = await this.resolveSessionRole(user.id);

    return this.issueFullSession(user.id, user.organisationId, roleCode ?? "owner_operator", true, user.mfaEnabled);
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

    await this.templatedEmail.send({
      templateCode: "email_verification",
      organisationId,
      to: email,
      variables: { verifyUrl },
      fallback: {
        subject: "Confirm your Buffr Checkpoint account",
        body: `Confirm your Buffr Checkpoint account by opening this link within 24 hours:\n\n${verifyUrl}\n\nIf you did not create this account, ignore this email.`,
      },
    });
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

    await this.db.update(applicationUsers).set({ mfaEnabled: true }).where(eq(applicationUsers.id, user.userId));
    sessionCache.invalidateUser(user.userId);

    await this.templatedEmail.send({
      templateCode: "mfa_enabled",
      organisationId: user.organisationId,
      to: account.email,
      variables: { email: account.email },
      fallback: {
        subject: "Authenticator MFA is now enabled",
        body: `Authenticator multi-factor authentication is now enabled on your Buffr Checkpoint account (${account.email}).\n\nStore your recovery codes somewhere safe. If you did not enable MFA, contact support immediately.`,
      },
    });

    if (user.audience === "ops_enroll" || user.audience === "ops") {
      // Staff enrolment: no customer onboarding state to move; issue the ops session.
      const session = await this.issueFullSession(user.userId, user.organisationId, PLATFORM_ROLE, true, true, "ops");
      return { recoveryCodes, nextPath: session.nextPath, accessToken: session.accessToken };
    }

    await this.onboardingState.advanceIfEarlyStage(user.organisationId, "in_progress", user.userId);

    const session = await this.issueFullSession(user.userId, user.organisationId, user.roleCode, true, true);

    return { recoveryCodes, nextPath: session.nextPath, accessToken: session.accessToken };
  }

  async verifyMfaChallenge(
    challengeToken: string,
    rawCode: string,
    recoveryCode?: string,
    audience: "admin" | "ops" = "admin",
  ): Promise<AccessTokenResult> {
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
    // Each front door only completes challenges for its own kind of account.
    if ((audience === "ops") !== (roleCode === PLATFORM_ROLE)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issueFullSession(user.id, user.organisationId, roleCode ?? "owner_operator", true, true, audience);
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
        this.db.query.platformSupportSession.findFirst({
          where: eq(platformSupportSession.id, authUser.supportSessionId),
        }),
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
        onboarding: {
          status: "live",
          currentStep: "complete",
          completedSteps: [],
          complete: true,
          canManage: authUser.permissions.includes(PERMISSIONS.ONBOARDING_MANAGE),
          nextPath: "/dashboard/overview",
        },
        subscription: await this.resolveSubscriptionEntitlement(authUser.organisationId),
      };
    }

    return sessionCache.getOrLoad("me", authUser.userId, authUser.organisationId, () => this.loadMe(authUser));
  }

  /**
   * Proxy gate for the admin app: one SQL round trip, cached briefly. Answers
   * only what routing needs (verification, onboarding position, entitlement).
   */
  async sessionGate(authUser: AuthenticatedUser) {
    if (authUser.supportSessionId) {
      const [subscription, orgRow] = await Promise.all([
        this.resolveSubscriptionEntitlement(authUser.organisationId),
        this.db.query.organisations.findFirst({ where: eq(organisations.id, authUser.organisationId) }),
      ]);
      if (!orgRow) throw new UnauthorizedException("Target organisation no longer exists");
      return {
        organisationName: orgRow.legalName,
        emailVerified: true,
        mfaEnabled: true,
        onboardingComplete: true,
        canManageOnboarding: authUser.permissions.includes(PERMISSIONS.ONBOARDING_MANAGE),
        operationalUseAllowed: subscription.operationalUseAllowed,
        nextPath: "/dashboard/overview",
      };
    }
    return sessionCache.getOrLoad("gate", authUser.userId, authUser.organisationId, async () => {
      const core = await this.loadSessionCore(authUser.userId, authUser.organisationId);
      return {
        organisationName: core.organisationName,
        emailVerified: core.emailVerified,
        mfaEnabled: core.mfaEnabled,
        onboardingComplete: core.statusCode === "live",
        canManageOnboarding: core.canManageOnboarding,
        operationalUseAllowed: core.operationalUseAllowed,
        nextPath: this.resolveNextPath(
          core.emailVerified,
          core.mfaEnabled,
          core.statusCode,
          core.stepCode,
          core.canManageOnboarding,
        ),
      };
    });
  }

  private async loadMe(authUser: AuthenticatedUser) {
    const [core, membershipRows] = await Promise.all([
      this.loadSessionCore(authUser.userId, authUser.organisationId),
      this.db.execute(sql`
        SELECT td.code AS role_code, ms.scope_id
        FROM organisation_memberships m
        JOIN role_definitions r ON r.id = m.role_id
        JOIN type_definition td ON td.id = r.role_code
        LEFT JOIN membership_scopes ms ON ms.membership_id = m.id
        WHERE m.user_id = ${authUser.userId} AND m.deleted_at IS NULL
      `),
    ]);

    const rows = membershipRows.rows as Array<{ role_code: string; scope_id: string | null }>;
    const roles = Array.from(new Set(rows.map((row) => row.role_code)));
    const siteScopes = Array.from(new Set(rows.map((row) => row.scope_id).filter((id): id is string => !!id)));
    const permissionSets = await Promise.all(
      roles.map((code) => this.permissionEvaluation.permissionsForRoleCode(code)),
    );
    const permissions = Array.from(new Set(permissionSets.flatMap((set) => Array.from(set))));

    return {
      user: {
        id: authUser.userId,
        email: core.email,
        emailVerified: core.emailVerified,
        mfaEnabled: core.mfaEnabled,
      },
      activeOrganisation: { id: authUser.organisationId, name: core.organisationName },
      memberships: [
        {
          organisationId: authUser.organisationId,
          organisationName: core.organisationName,
          roles,
          siteScopes,
        },
      ],
      permissions,
      onboarding: {
        status: core.statusCode ?? "pending_email_verification",
        currentStep: core.stepCode ?? "organisation_profile",
        completedSteps: core.progress.completed,
        skippedSteps: core.progress.skipped,
        launchRoute: core.progress.route,
        steps: describeSteps(core.progress),
        missingBeforeGolive: missingBeforeGolive(core.progress),
        complete: core.statusCode === "live",
        canManage: core.canManageOnboarding,
        nextPath: this.resolveNextPath(
          core.emailVerified,
          core.mfaEnabled,
          core.statusCode,
          core.stepCode,
          core.canManageOnboarding,
        ),
      },
      subscription: {
        operationalUseAllowed: core.operationalUseAllowed,
        status: core.subscriptionStatus,
      },
    };
  }

  /** User, organisation, onboarding position, authority and entitlement in one statement. */
  private async loadSessionCore(userId: string, organisationId: string) {
    const result = await this.db.execute(sql`
      SELECT
        u.email,
        u.email_verified_at IS NOT NULL AS email_verified,
        u.mfa_enabled,
        o.legal_name AS organisation_name,
        st.code AS status_code,
        sc.code AS step_code,
        COALESCE(os.completed_step_codes, '[]'::jsonb) AS completed_step_codes,
        COALESCE(os.skipped_step_codes, '[]'::jsonb) AS skipped_step_codes,
        lr.code AS launch_route,
        EXISTS (
          SELECT 1
          FROM organisation_memberships m
          JOIN role_definitions r ON r.id = m.role_id
          JOIN role_permission_grants g ON g.role_code = r.role_code
          WHERE m.user_id = u.id
            AND m.deleted_at IS NULL
            AND g.permission_code = ${PERMISSIONS.ONBOARDING_MANAGE}
        ) AS can_manage_onboarding,
        sub.status AS subscription_status,
        COALESCE(sub.status IN ('active', 'trial'), FALSE) AS operational_use_allowed
      FROM application_users u
      JOIN organisations o ON o.id = ${organisationId}
      LEFT JOIN organisation_onboarding_states os
        ON os.organisation_id = o.id AND os.deleted_at IS NULL
      LEFT JOIN type_definition st ON st.id = os.status_code
      LEFT JOIN type_definition sc ON sc.id = os.current_step_code
      LEFT JOIN type_definition lr ON lr.id = os.launch_route_code
      LEFT JOIN LATERAL (
        SELECT ss.code AS status
        FROM organisation_subscription s
        JOIN type_definition ss ON ss.id = s.status_code
        WHERE s.organisation_id = o.id AND s.deleted_at IS NULL
        ORDER BY (ss.code IN ('active', 'trial')) DESC, s.started_at DESC
        LIMIT 1
      ) sub ON TRUE
      WHERE u.id = ${userId} AND u.deleted_at IS NULL
    `);
    const row = result.rows[0] as
      | {
          email: string;
          email_verified: boolean;
          mfa_enabled: boolean;
          organisation_name: string;
          status_code: string | null;
          step_code: string | null;
          completed_step_codes: string[] | null;
          skipped_step_codes: string[] | null;
          launch_route: string | null;
          can_manage_onboarding: boolean;
          subscription_status: string | null;
          operational_use_allowed: boolean;
        }
      | undefined;
    if (!row) {
      throw new UnauthorizedException("Account or organisation no longer exists");
    }
    const progress = {
      route: isLaunchRoute(row.launch_route) ? row.launch_route : null,
      completed: sanitizeStepList(row.completed_step_codes),
      skipped: sanitizeStepList(row.skipped_step_codes),
    };
    return {
      email: row.email,
      emailVerified: row.email_verified === true,
      mfaEnabled: row.mfa_enabled === true,
      organisationName: row.organisation_name,
      statusCode: row.status_code,
      // The pointer is derived (first incomplete required step), never trusted from storage.
      stepCode: row.status_code ? currentStep(progress) : row.step_code,
      progress,
      canManageOnboarding: row.can_manage_onboarding === true,
      subscriptionStatus: row.subscription_status,
      operationalUseAllowed: row.operational_use_allowed === true,
    };
  }

  async getOnboardingStatus(user: AuthenticatedUser) {
    const me = await this.me(user);
    return me.onboarding;
  }

  /** Acting user's email and organisation name for billing notices; null for support sessions. */
  async billingContact(user: AuthenticatedUser): Promise<{ email: string; organisationName: string } | null> {
    if (user.supportSessionId) return null;
    const core = await this.loadSessionCore(user.userId, user.organisationId);
    return { email: core.email, organisationName: core.organisationName ?? "your organisation" };
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
    const resetUrl = `${adminBase}/auth/reset-password?token=${rawToken}`;
    await this.templatedEmail.send({
      templateCode: "password_reset",
      organisationId: user.organisationId,
      to: user.email,
      variables: { resetUrl },
      fallback: {
        subject: "Reset your Buffr Checkpoint password",
        body: `We received a request to reset the password for your Buffr Checkpoint account.\n\nOpen this link within one hour to choose a new password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email. Your password will stay the same.`,
      },
    });

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

    const account = await this.db.query.applicationUsers.findFirst({
      where: eq(applicationUsers.id, candidate.userId),
    });
    if (account) {
      const adminBase = (process.env.PUBLIC_ADMIN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
      await this.templatedEmail.send({
        templateCode: "password_changed",
        organisationId: account.organisationId,
        to: account.email,
        variables: {
          email: account.email,
          forgotPasswordUrl: `${adminBase}/auth/forgot-password`,
        },
        fallback: {
          subject: "Your Buffr Checkpoint password was changed",
          body: `The password for your Buffr Checkpoint account (${account.email}) was changed successfully.\n\nIf you did not make this change, reset your password immediately: ${adminBase}/auth/forgot-password`,
        },
      });
    }

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
        message: "Too many failed sign-in attempts. Wait a few minutes or reset your password, then try again.",
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
      const lockoutMinutes = String(Math.round(LOGIN_LOCKOUT_MS / 60_000));
      await this.templatedEmail.send({
        templateCode: "account_lockout",
        organisationId: user.organisationId,
        to: user.email,
        variables: {
          lockoutMinutes,
          forgotPasswordUrl: `${adminBase}/auth/forgot-password`,
          lockedAtUtc: new Date(now).toISOString(),
        },
        fallback: {
          subject: "Buffr Checkpoint sign-in temporarily locked",
          body: [
            "Someone tried to sign in to your Buffr Checkpoint account with the wrong password several times.",
            `Your account is locked for about ${lockoutMinutes} minutes.`,
            `If this was not you, reset your password: ${adminBase}/auth/forgot-password`,
            `Time (UTC): ${new Date(now).toISOString()}`,
          ].join("\n\n"),
        },
      });
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
    return chosen
      ? { roleCode: chosen.roleCode, membershipId: chosen.membershipId }
      : { roleCode: null, membershipId: null };
  }

  private async issueFullSession(
    userId: string,
    organisationId: string,
    roleCode: string,
    emailVerified: boolean,
    mfaEnabled: boolean,
    audience: "admin" | "ops" = "admin",
  ): Promise<AccessTokenResult> {
    // Ops Console health-score signal ("admin login recency") — every
    // successful login path (password-only, post-MFA-challenge) converges
    // here, so this is the one place to record it.
    await this.db.update(applicationUsers).set({ lastLoginAt: new Date() }).where(eq(applicationUsers.id, userId));
    sessionCache.invalidateUser(userId);

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
    const permissions = Array.from(await this.permissionEvaluation.permissionsForRoleCode(roleCode));
    const nextPath =
      audience === "ops"
        ? "/"
        : this.resolveNextPath(
            emailVerified,
            mfaEnabled,
            statusRow?.code,
            stepRow?.code,
            permissions.includes(PERMISSIONS.ONBOARDING_MANAGE),
          );

    const accessToken = this.jwt.sign(
      {
        sub: userId,
        organisationId,
        siteId: null,
        roleCode,
        permissions,
        emailVerified,
        mfaEnabled,
        aud: audience,
      },
      { expiresIn: audience === "ops" ? OPS_SESSION_TTL : ADMIN_SESSION_TTL },
    );
    return { accessToken, emailVerified, mfaEnabled, onboardingComplete, nextPath };
  }

  resolveNextPath(
    emailVerified: boolean,
    mfaEnabled: boolean,
    statusCode?: string | null,
    stepCode?: string | null,
    canManageOnboarding = true,
  ): string {
    if (!emailVerified) return "/auth/check-email";
    if (!mfaEnabled) return "/auth/mfa/setup";
    if (statusCode === "live") return "/dashboard/overview";
    if (!canManageOnboarding) return "/onboarding/waiting";
    if (stepCode) return `/onboarding/${stepCode.replace(/_/g, "-")}`;
    return "/onboarding/organisation-profile";
  }

  /**
   * Operational use (go-live + post-go-live dashboard) requires subscription
   * status `active` (POP approved) or `trial` (ops design-partner grant).
   */
  async resolveSubscriptionEntitlement(organisationId: string): Promise<{
    operationalUseAllowed: boolean;
    status: string | null;
  }> {
    // An active or trial subscription wins; otherwise report the most recent one.
    const [row] = await this.db
      .select({ code: typeDefinition.code })
      .from(organisationSubscription)
      .innerJoin(typeDefinition, eq(typeDefinition.id, organisationSubscription.statusCode))
      .where(
        and(eq(organisationSubscription.organisationId, organisationId), isNull(organisationSubscription.deletedAt)),
      )
      .orderBy(desc(sql`${typeDefinition.code} IN ('active', 'trial')`), desc(organisationSubscription.startedAt))
      .limit(1);
    const status = row?.code ?? null;
    return { operationalUseAllowed: status === "active" || status === "trial", status };
  }
}
