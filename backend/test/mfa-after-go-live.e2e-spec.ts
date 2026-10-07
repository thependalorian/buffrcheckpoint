import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, eq, isNull } from "drizzle-orm";
import { authenticator } from "otplib";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";
import { sessionCache } from "../src/common/auth/session-cache";
import { generateOpaqueToken, hashOpaqueToken } from "../src/common/crypto/secret-crypto";
import type { Database } from "../src/db/client";
import { DB } from "../src/db/db.module";
import {
  applicationUsers,
  emailVerificationTokens,
  organisationOnboardingStates,
  organisations,
} from "../src/db/schema";
import { TypeDefinitionLookupService } from "../src/db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

jest.setTimeout(120_000);

/** MFA comes after onboarding: optional while setting up, required once the organisation is live. Runs against a disposable Neon branch. */
describe("MFA after onboarding (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let typeDefs: TypeDefinitionLookupService;
  let token: string;
  let organisationId: string;
  const runId = Date.now();

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY =
      process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
    process.env.EMAIL_VERIFICATION_PEPPER = process.env.EMAIL_VERIFICATION_PEPPER ?? "test-email-pepper";
    process.env.MFA_CHALLENGE_PEPPER = process.env.MFA_CHALLENGE_PEPPER ?? "test-mfa-challenge-pepper";
    process.env.MFA_GATE_CACHE_TTL_MS = "0";
    authenticator.options = { window: 1 };

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(DB);
    typeDefs = moduleFixture.get(TypeDefinitionLookupService);

    const ownerEmail = `e2e-mfa-gate-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E MFA Gate ${runId}`,
        sectorCode: "sme",
        email: ownerEmail,
        password: "testpassword123",
      })
      .expect(201);
    organisationId = created.body.organisationId as string;
    const user = await db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, ownerEmail), isNull(applicationUsers.deletedAt)),
    });
    if (!user) throw new Error("owner missing");
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const verified = await request(app.getHttpServer())
      .post("/auth/email-verification/verify")
      .send({ token: raw })
      .expect(200);
    token = verified.body.accessToken as string;
    expect(verified.body.mfaEnabled).toBe(false);
  });

  afterAll(async () => {
    if (organisationId) {
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, organisationId));
    }
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("sends a verified user without MFA to onboarding, and lets them set the organisation up", async () => {
    const gate = await request(app.getHttpServer()).get("/auth/session-gate").set(auth()).expect(200);
    expect(gate.body.mfaEnabled).toBe(false);
    expect(gate.body.nextPath).toMatch(/^\/onboarding\//);
    await request(app.getHttpServer()).post("/sites").set(auth()).send({ name: "Main reception" }).expect(201);
    await request(app.getHttpServer()).get("/auth/onboarding/readiness").set(auth()).expect(200);
  });

  it("requires MFA setup once the organisation is live, and only the account endpoints stay open", async () => {
    const live = await typeDefs.id("organisation_onboarding_status", "live");
    await db
      .update(organisationOnboardingStates)
      .set({ statusCode: live })
      .where(eq(organisationOnboardingStates.organisationId, organisationId));
    sessionCache.invalidateOrganisation(organisationId); // the real go-live path does this; a direct update does not

    const blocked = await request(app.getHttpServer()).get("/sites").set(auth()).expect(403);
    expect(String(blocked.body.message)).toContain("mfa_setup_required");
    await request(app.getHttpServer()).post("/sites").set(auth()).send({ name: "Second" }).expect(403);
    await request(app.getHttpServer()).get("/auth/me").set(auth()).expect(200);
    const gate = await request(app.getHttpServer()).get("/auth/session-gate").set(auth()).expect(200);
    expect(gate.body.nextPath).toBe("/auth/mfa/setup");
  });

  it("opens everything again after MFA is enrolled", async () => {
    const start = await request(app.getHttpServer()).post("/auth/mfa/enroll/start").set(auth()).expect(201);
    const confirm = await request(app.getHttpServer())
      .post("/auth/mfa/enroll/confirm")
      .set(auth())
      .send({ code: authenticator.generate(start.body.secret as string) })
      .expect(201);
    token = confirm.body.accessToken as string;
    expect(confirm.body.nextPath).toBe("/dashboard/overview");
    await request(app.getHttpServer()).get("/sites").set(auth()).expect(200);
  });
});
