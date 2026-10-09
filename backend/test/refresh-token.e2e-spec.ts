import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { and, eq, isNull } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";
import { generateOpaqueToken, hashOpaqueToken } from "../src/common/crypto/secret-crypto";
import type { Database } from "../src/db/client";
import { DB } from "../src/db/db.module";
import {
  applicationUsers,
  emailVerificationTokens,
  organisationMemberships,
  organisations,
  roleDefinitions,
  sites,
} from "../src/db/schema";
import { randomUUID } from "node:crypto";

jest.setTimeout(60_000);

// SE-1 and SE-2: signed in sessions refresh once per token, a reused refresh token revokes the whole chain, and the public keys are published.
describe("refresh tokens and key set (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  const runId = Date.now();
  const orgIds: string[] = [];

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY =
      process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
    process.env.EMAIL_VERIFICATION_PEPPER = process.env.EMAIL_VERIFICATION_PEPPER ?? "test-email-pepper";
    process.env.MFA_CHALLENGE_PEPPER = process.env.MFA_CHALLENGE_PEPPER ?? "test-mfa-challenge-pepper";
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(DB);
  });

  afterAll(async () => {
    for (const id of orgIds) {
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

  async function signedInSession() {
    const email = `e2e-refresh-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Refresh ${runId}`,
        sectorCode: "sme",
        acceptTerms: true,
        email,
        password: "blue tractor sings 123",
      })
      .expect(201);
    orgIds.push(created.body.organisationId);
    const user = await db.query.applicationUsers.findFirst({
      where: and(eq(applicationUsers.email, email), isNull(applicationUsers.deletedAt)),
    });
    if (!user) throw new Error("user missing");
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const verified = await request(app.getHttpServer())
      .post("/auth/email-verification/verify")
      .send({ token: raw })
      .expect(200);
    return verified.body as { accessToken: string; refreshToken: string };
  }

  it("publishes only public EdDSA keys", async () => {
    const res = await request(app.getHttpServer()).get("/.well-known/jwks.json").expect(200);
    expect(res.body.keys.length).toBeGreaterThanOrEqual(1);
    for (const key of res.body.keys) {
      expect(key).toMatchObject({ kty: "OKP", crv: "Ed25519", alg: "EdDSA" });
      expect(key.d).toBeUndefined();
    }
  });

  it("rotates a refresh token once, and a reused token revokes the whole chain and older access tokens", async () => {
    const first = await signedInSession();
    expect(first.refreshToken).toMatch(/^[0-9a-f-]{36}\.[0-9a-f]{64}$/);
    await request(app.getHttpServer()).get("/auth/me").set("Authorization", `Bearer ${first.accessToken}`).expect(200);

    const second = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    expect(second.body.refreshToken).not.toBe(first.refreshToken);
    await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${second.body.accessToken}`)
      .expect(200);

    // Token times have one-second resolution, so wait before the reuse that must invalidate everything issued earlier.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await request(app.getHttpServer()).post("/auth/refresh").send({ refreshToken: first.refreshToken }).expect(401);

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: second.body.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${second.body.accessToken}`)
      .expect(401);
  });

  it("refuses a malformed or unknown refresh token with the same 401", async () => {
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: "x".repeat(80) })
      .expect(401);
    const unknown = `${randomUUID()}.${"a".repeat(64)}`;
    await request(app.getHttpServer()).post("/auth/refresh").send({ refreshToken: unknown }).expect(401);
  });
});
