import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, eq, isNull } from "drizzle-orm";
import { authenticator } from "otplib";
import request from "supertest";
import type { App } from "supertest/types";
import { randomUUID } from "node:crypto";

import { AppModule } from "../src/app.module";
import { decryptSecret, generateOpaqueToken, hashOpaqueToken } from "../src/common/crypto/secret-crypto";
import type { Database } from "../src/db/client";
import { DB } from "../src/db/db.module";
import {
  applicationUsers,
  auditEvents,
  emailVerificationTokens,
  organisationMemberships,
  organisations,
  privilegedAccessGrants,
  roleDefinitions,
  sites,
} from "../src/db/schema";
import { TypeDefinitionLookupService } from "../src/db/type-definition-lookup.service";

jest.setTimeout(60_000);

describe("Secure onboarding auth (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let typeDefs: TypeDefinitionLookupService;
  let jwt: JwtService;

  const runId = Date.now();
  const createdOrgIds: string[] = [];
  const email = (label: string) => `e2e-${label}-${runId}@example.test`;

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY =
      process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
    process.env.EMAIL_VERIFICATION_PEPPER = process.env.EMAIL_VERIFICATION_PEPPER ?? "test-email-pepper";
    process.env.MFA_CHALLENGE_PEPPER = process.env.MFA_CHALLENGE_PEPPER ?? "test-mfa-challenge-pepper";
    process.env.PUBLIC_ADMIN_BASE_URL = process.env.PUBLIC_ADMIN_BASE_URL ?? "http://localhost:3000";
    authenticator.options = { window: 1 };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(DB);
    typeDefs = moduleFixture.get(TypeDefinitionLookupService);
    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    for (const id of createdOrgIds) {
      await db.update(sites).set({ deletedAt: new Date() }).where(eq(sites.organisationId, id));
      await db
        .update(organisationMemberships)
        .set({ deletedAt: new Date() })
        .where(eq(organisationMemberships.organisationId, id));
      await db.update(roleDefinitions).set({ deletedAt: new Date() }).where(eq(roleDefinitions.organisationId, id));
      await db.update(applicationUsers).set({ deletedAt: new Date() }).where(eq(applicationUsers.organisationId, id));
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, id));
    }
    await app.close();
  });

  async function verifyLatestEmail(userEmail: string): Promise<string> {
    const user = await db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, userEmail), isNull(applicationUsers.deletedAt)),
    });
    if (!user) throw new Error(`user missing for ${userEmail}`);
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const verified = await request(app.getHttpServer())
      .post("/auth/email-verification/verify")
      .send({ token: raw })
      .expect(200);
    return verified.body.accessToken as string;
  }

  async function enrollMfa(accessToken: string): Promise<string> {
    const start = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/start")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201);
    const code = authenticator.generate(start.body.secret as string);
    const confirm = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ code })
      .expect(201);
    expect(confirm.body.recoveryCodes).toHaveLength(10);
    return confirm.body.accessToken as string;
  }

  it("creates a pending organisation without issuing an access token", async () => {
    const response = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Org A ${runId}`,
        sectorCode: "sme",
        email: email("org-a-admin"),
        password: "testpassword123",
      })
      .expect(201);

    expect(response.body.accessToken).toBeUndefined();
    expect(response.body.emailVerificationRequired).toBe(true);
    expect(response.body.organisationId).toEqual(expect.any(String));
    createdOrgIds.push(response.body.organisationId);

    const events = await db
      .select({ actionCode: auditEvents.actionCode })
      .from(auditEvents)
      .where(eq(auditEvents.organisationId, response.body.organisationId));
    expect(events.map((event) => event.actionCode).sort()).toEqual([
      "application_user.register",
      "organisation.create",
    ]);
  });

  it("rejects duplicate email signup", async () => {
    await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `Should Not Exist ${runId}`,
        sectorCode: "sme",
        email: email("org-a-admin"),
        password: "testpassword123",
      })
      .expect(409);
  });

  it("denies full login until email is verified", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: email("org-a-admin"), password: "testpassword123" })
      .expect(200);

    expect(response.body.emailVerificationRequired).toBe(true);
    expect(response.body.accessToken).toBeUndefined();
  });

  it("verifies email, enrolls MFA, and allows privileged reads with MFA", async () => {
    const accessToken = await verifyLatestEmail(email("org-a-admin"));
    const mfaToken = await enrollMfa(accessToken);

    const me = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${mfaToken}`)
      .expect(200);

    expect(me.body.user.mfaEnabled).toBe(true);
    expect(me.body.onboarding.complete).toBe(false);
    expect(me.body.onboarding.nextPath).toMatch(/^\/onboarding\//);

    await request(app.getHttpServer())
      .get("/compliance/dashboard")
      .set("Authorization", `Bearer ${mfaToken}`)
      .expect(200);

    const site = await request(app.getHttpServer())
      .post("/sites")
      .set("Authorization", `Bearer ${mfaToken}`)
      .send({ name: `E2E Site ${runId}` })
      .expect(201);
    expect(site.body.organisationId).toBe(createdOrgIds[0]);
  });

  it("requires MFA challenge on subsequent login", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: email("org-a-admin"), password: "testpassword123" })
      .expect(200);

    expect(login.body.mfaRequired).toBe(true);
    expect(login.body.mfaChallengeToken).toEqual(expect.any(String));
    expect(login.body.accessToken).toBeUndefined();

    const user = await db.query.applicationUsers.findFirst({
      where: eq(applicationUsers.email, email("org-a-admin")),
    });
    if (!user?.mfaSecretReference) throw new Error("mfa secret missing");
    const secret = decryptSecret(user.mfaSecretReference);
    const code = authenticator.generate(secret);

    const verified = await request(app.getHttpServer())
      .post("/auth/mfa/challenge/verify")
      .send({ challengeToken: login.body.mfaChallengeToken, code })
      .expect(200);

    expect(verified.body.accessToken).toEqual(expect.any(String));
  });

  it("rejects expired verification tokens", async () => {
    const user = await db.query.applicationUsers.findFirst({
      where: eq(applicationUsers.email, email("org-a-admin")),
    });
    if (!user) throw new Error("user missing");
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() - 60_000),
    });

    await request(app.getHttpServer()).post("/auth/email-verification/verify").send({ token: raw }).expect(401);
  });

  it("isolates tenants when guessing another organisation site id", async () => {
    const orgB = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Org B ${runId}`,
        sectorCode: "sme",
        email: email("org-b-admin"),
        password: "testpassword123",
      })
      .expect(201);
    createdOrgIds.push(orgB.body.organisationId);

    const orgBToken = await enrollMfa(await verifyLatestEmail(email("org-b-admin")));
    const orgBSite = await request(app.getHttpServer())
      .post("/sites")
      .set("Authorization", `Bearer ${orgBToken}`)
      .send({ name: `E2E Org B Site ${runId}` })
      .expect(201);

    const orgALogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: email("org-a-admin"), password: "testpassword123" })
      .expect(200);
    expect(orgALogin.body.mfaChallengeToken).toEqual(expect.any(String));
    const userA = await db.query.applicationUsers.findFirst({
      where: eq(applicationUsers.email, email("org-a-admin")),
    });
    if (!userA?.mfaSecretReference) throw new Error("missing secret");
    const secret = decryptSecret(userA.mfaSecretReference);
    let orgASession = await request(app.getHttpServer())
      .post("/auth/mfa/challenge/verify")
      .send({
        challengeToken: orgALogin.body.mfaChallengeToken,
        code: authenticator.generate(secret),
      });
    if (orgASession.status !== 200) {
      const retryLogin = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: email("org-a-admin"), password: "testpassword123" })
        .expect(200);
      orgASession = await request(app.getHttpServer())
        .post("/auth/mfa/challenge/verify")
        .send({
          challengeToken: retryLogin.body.mfaChallengeToken,
          code: authenticator.generate(secret),
        });
    }
    expect(orgASession.status).toBe(200);

    await request(app.getHttpServer())
      .get(`/sites/${orgBSite.body.id}`)
      .set("Authorization", `Bearer ${orgASession.body.accessToken}`)
      .expect(404);
  });

  it("rejects platform_support actions without an active grant", async () => {
    const orgId = createdOrgIds[0];
    const [supportRoleCode, initialAssignmentType] = await Promise.all([
      typeDefs.id("role_code", "platform_support"),
      typeDefs.id("role_assignment_event_type", "initial"),
    ]);

    const roleId = randomUUID();
    const userId = randomUUID();
    await db.insert(roleDefinitions).values({
      id: roleId,
      organisationId: orgId,
      roleCode: supportRoleCode,
      roleLabel: "Platform Support",
      isSystemRole: true,
    });
    await db.insert(applicationUsers).values({
      id: userId,
      organisationId: orgId,
      email: email("expired-support"),
      passwordHash: "unused-for-this-test",
      emailVerifiedAt: new Date(),
      mfaEnabled: true,
    });
    await db.insert(organisationMemberships).values({
      id: randomUUID(),
      organisationId: orgId,
      userId,
      roleId,
      assignmentEventTypeCode: initialAssignmentType,
    });

    const anyReason = await db.query.typeDefinition.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.domain, "support_access_reason"),
    });
    if (!anyReason) throw new Error("No support_access_reason seeded");

    const now = Date.now();
    await db.insert(privilegedAccessGrants).values({
      id: randomUUID(),
      organisationId: orgId,
      grantedToUserId: userId,
      reasonCode: anyReason.id,
      approvedBy: userId,
      startsAt: new Date(now - 2 * 60 * 60 * 1000),
      expiresAt: new Date(now - 60 * 60 * 1000),
    });

    const token = jwt.sign({
      sub: userId,
      organisationId: orgId,
      siteId: null,
      roleCode: "platform_support",
      permissions: ["capability.write"],
      emailVerified: true,
      mfaEnabled: true,
    });

    await request(app.getHttpServer())
      .patch("/capability-status")
      .set("Authorization", `Bearer ${token}`)
      .send({
        capabilityCode: "diginam_verification",
        status: "live",
        publicStatus: "live",
        evidenceReference: "test",
      })
      .expect(403);
  });
});
