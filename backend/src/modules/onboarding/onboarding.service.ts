import { ConflictException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  applicationUsers,
  auditEvents,
  organisationMemberships,
  organisationOnboardingStates,
  organisations,
  roleDefinitions,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { AuthService } from "../auth/auth.service";
import { BuffrIdService, legacyPasswordMode } from "../auth/buffr-id.service";
import { TemplatedEmailService } from "../notifications/templated-email.service";
import type { CreateOrganisationAdminDto } from "./dto/create-organisation-admin.dto";
import { assessSignup, emailDomain, signupLimitsFromEnv } from "./signup-abuse";
import { createHash, randomUUID } from "node:crypto";

const BCRYPT_ROUNDS = 12;

export interface OnboardingResult {
  ok: true;
  email: string;
  organisationId: string;
  emailVerificationRequired: boolean;
}

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly authService: AuthService,
    private readonly buffrId: BuffrIdService,
    private readonly templatedEmail: TemplatedEmailService,
  ) {}

  /** Refuses obvious sign-up abuse before anything is written or any email is sent (signup-abuse.ts). */
  private async assertNotAbusive(dto: CreateOrganisationAdminDto): Promise<void> {
    const domain = emailDomain(dto.email);
    const [pending, recent] = await Promise.all([
      this.db.execute(sql`
        SELECT count(*)::int AS n FROM application_users
        WHERE deleted_at IS NULL AND email_verified_at IS NULL AND lower(split_part(email, '@', 2)) = ${domain}`),
      this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.actionCode, "organisation.create"),
            gt(auditEvents.occurredAt, new Date(Date.now() - 3_600_000)),
          ),
        ),
    ]);
    const refusal = assessSignup({
      honeypot: dto.website,
      email: dto.email,
      pendingFromDomain: Number((pending.rows[0] as { n?: number } | undefined)?.n ?? 0),
      createdLastHour: Number(recent[0]?.n ?? 0),
      limits: signupLimitsFromEnv(),
    });
    if (refusal) {
      // One generic message: do not tell a bot which rule it tripped.
      throw new HttpException(
        "Sign-up is not available right now. Try again later or contact support.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async createOrganisationAdmin(dto: CreateOrganisationAdminDto): Promise<OnboardingResult> {
    if (legacyPasswordMode() !== "on") throw new ForbiddenException("Create your account with Buffr ID");
    await this.assertNotAbusive(dto);
    const existing = await this.db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, dto.email), isNull(applicationUsers.deletedAt)),
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.provision(dto, { passwordHash, emailVerified: false, mfaEnabled: false, buffrIdSubject: null });
  }

  /**
   * Creates an organisation and its owner from a Buffr ID sign-in. The owner has no Checkpoint password: Buffr ID proved the email
   * and holds the credentials. The organisation starts at email_verified, because Buffr ID already confirmed the address.
   */
  async createOrganisationWithBuffrId(input: {
    idToken: string;
    organisationName: string;
    sectorCode: string;
    nonce?: string;
  }): Promise<OnboardingResult> {
    const identity = await this.buffrId.verifyIdToken(input.idToken, "admin", input.nonce);
    const dto = {
      organisationName: input.organisationName,
      sectorCode: input.sectorCode,
      email: identity.email,
      password: "",
    };
    await this.assertNotAbusive({ ...dto, website: undefined });
    const existing = await this.db.query.applicationUsers.findFirst({
      where: and(
        isNull(applicationUsers.deletedAt),
        sql`(lower(${applicationUsers.email}) = ${identity.email} OR ${applicationUsers.buffrIdSubject} = ${identity.subject})`,
      ),
    });
    if (existing) throw new ConflictException("An account for this Buffr ID already exists. Sign in instead.");
    return this.provision(dto, {
      passwordHash: null,
      emailVerified: true,
      mfaEnabled: identity.twoFactorEnabled,
      buffrIdSubject: identity.subject,
    });
  }

  private async provision(
    dto: { organisationName: string; sectorCode: string; email: string },
    opts: { passwordHash: string | null; emailVerified: boolean; mfaEnabled: boolean; buffrIdSubject: string | null },
  ): Promise<OnboardingResult> {
    const { passwordHash } = opts;
    const [sectorCodeId, ownerOperatorRoleCodeId, initialAssignmentTypeId, pendingStatusId, firstStepId] =
      await Promise.all([
        this.typeDefs.id("organisation_sector", dto.sectorCode),
        this.typeDefs.id("role_code", "owner_operator"),
        this.typeDefs.id("role_assignment_event_type", "initial"),
        this.typeDefs.id(
          "organisation_onboarding_status",
          opts.emailVerified ? "email_verified" : "pending_email_verification",
        ),
        this.typeDefs.id("onboarding_step_code", "organisation_profile"),
      ]);

    const organisationId = randomUUID();
    const roleId = randomUUID();
    const userId = randomUUID();
    const membershipId = randomUUID();
    const onboardingStateId = randomUUID();
    const orgAuditEventId = randomUUID();
    const userAuditEventId = randomUUID();
    const occurredAt = new Date();

    const orgEventHash = hashAuditEvent({
      organisationId,
      actorId: null,
      actionCode: "organisation.create",
      resourceType: "organisation",
      resourceId: organisationId,
      occurredAt,
      prevEventHash: null,
    });
    const userEventHash = hashAuditEvent({
      organisationId,
      actorId: userId,
      actionCode: "application_user.register",
      resourceType: "application_user",
      resourceId: userId,
      occurredAt,
      prevEventHash: orgEventHash,
    });

    await this.db.batch([
      this.db.insert(organisations).values({
        id: organisationId,
        legalName: dto.organisationName,
        tradingName: dto.organisationName,
        sectorCode: sectorCodeId,
      }),
      this.db.insert(roleDefinitions).values({
        id: roleId,
        organisationId,
        roleCode: ownerOperatorRoleCodeId,
        roleLabel: "Owner-Operator",
        isSystemRole: true,
      }),
      this.db.insert(applicationUsers).values({
        id: userId,
        organisationId,
        email: dto.email,
        passwordHash,
        emailVerifiedAt: opts.emailVerified ? occurredAt : null,
        mfaEnabled: opts.mfaEnabled,
        buffrIdSubject: opts.buffrIdSubject,
      }),
      this.db.insert(organisationMemberships).values({
        id: membershipId,
        organisationId,
        userId,
        roleId,
        assignmentEventTypeCode: initialAssignmentTypeId,
      }),
      this.db.insert(organisationOnboardingStates).values({
        id: onboardingStateId,
        organisationId,
        statusCode: pendingStatusId,
        currentStepCode: firstStepId,
        completedStepCodes: [],
      }),
      this.db.insert(auditEvents).values({
        id: orgAuditEventId,
        organisationId,
        actorId: null,
        actionCode: "organisation.create",
        resourceType: "organisation",
        resourceId: organisationId,
        occurredAt,
        prevEventHash: null,
        eventHash: orgEventHash,
      }),
      this.db.insert(auditEvents).values({
        id: userAuditEventId,
        organisationId,
        actorId: userId,
        actionCode: "application_user.register",
        resourceType: "application_user",
        resourceId: userId,
        occurredAt,
        prevEventHash: orgEventHash,
        eventHash: userEventHash,
      }),
    ]);

    if (!opts.emailVerified) await this.authService.issueEmailVerification(userId, organisationId, dto.email);
    await this.notifyOpsOfNewOrganisation({
      organisationId,
      organisationName: dto.organisationName,
      adminEmail: dto.email,
      sectorCode: dto.sectorCode,
    });
    await this.sendOrgWelcome({
      organisationId,
      organisationName: dto.organisationName,
      adminEmail: dto.email,
    });

    return {
      ok: true,
      email: dto.email,
      organisationId,
      emailVerificationRequired: !opts.emailVerified,
    };
  }

  private async sendOrgWelcome(input: {
    organisationId: string;
    organisationName: string;
    adminEmail: string;
  }): Promise<void> {
    const adminUrl = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    await this.templatedEmail.send({
      templateCode: "org_welcome",
      organisationId: input.organisationId,
      to: input.adminEmail,
      variables: {
        organisationName: input.organisationName,
        adminEmail: input.adminEmail,
        adminUrl,
      },
      fallback: {
        subject: "Welcome to Buffr Checkpoint",
        body: `Welcome to Buffr Checkpoint, ${input.organisationName}.\n\nYour Owner-Operator account is ${input.adminEmail}. Confirm your email if you have not already, then continue onboarding in the admin console:\n${adminUrl}\n\nBilling is EFT with proof of payment. Go-live requires an active or trial subscription after POP review.`,
      },
    });
  }

  /** Fire-and-forget ops alert so signup-first outreach does not depend on watching the console. */
  private async notifyOpsOfNewOrganisation(input: {
    organisationId: string;
    organisationName: string;
    adminEmail: string;
    sectorCode: string;
  }): Promise<void> {
    const opsInbox = TemplatedEmailService.resolveOpsInbox();
    if (!opsInbox) {
      return;
    }
    const adminUrl = (process.env.PUBLIC_ADMIN_BASE_URL ?? "https://admin.buffrcheckpoint.com").replace(/\/$/, "");
    const opsBase = (process.env.PUBLIC_OPS_BASE_URL ?? "https://ops.buffrcheckpoint.com").replace(/\/$/, "");
    await this.templatedEmail.send({
      templateCode: "ops_new_organisation",
      organisationId: input.organisationId,
      to: opsInbox,
      variables: {
        organisationName: input.organisationName,
        organisationId: input.organisationId,
        adminEmail: input.adminEmail,
        sectorCode: input.sectorCode,
        adminUrl,
        opsOrgUrl: `${opsBase}/organisations`,
      },
      fallback: {
        subject: `New org signup: ${input.organisationName}`,
        body: [
          "New Buffr Checkpoint organisation registered (signup-first).",
          "",
          `Organisation: ${input.organisationName}`,
          `Organisation ID: ${input.organisationId}`,
          `Owner-Operator email: ${input.adminEmail}`,
          `Sector code: ${input.sectorCode}`,
          "",
          "Outreach checklist:",
          "1) Ask if they will self-complete onboarding or need assisted setup.",
          "2) Point them at Pricing then EFT + upload POP under Billing (or grant trial).",
          "3) After POP (+ KYB) review, set subscription active — go-live requires active or trial.",
          "",
          `Admin: ${adminUrl}`,
          `Ops: ${opsBase}/organisations`,
        ].join("\n"),
      },
    });
  }
}

function hashAuditEvent(fields: {
  organisationId: string;
  actorId: string | null;
  actionCode: string;
  resourceType: string;
  resourceId: string | null;
  occurredAt: Date;
  prevEventHash: string | null;
}): string {
  const payload = JSON.stringify({
    organisationId: fields.organisationId,
    actorId: fields.actorId,
    actionCode: fields.actionCode,
    resourceType: fields.resourceType,
    resourceId: fields.resourceId,
    occurredAt: fields.occurredAt.toISOString(),
    prevEventHash: fields.prevEventHash,
  });
  return createHash("sha256").update(payload).digest("hex");
}
