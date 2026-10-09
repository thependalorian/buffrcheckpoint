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
import { applicationUsers, emailVerificationTokens, organisationMemberships, organisations, roleDefinitions, sites } from "../src/db/schema";
import { randomUUID } from "node:crypto";

jest.setTimeout(120_000);

// AZ-1, AZ-9, API-11: an object id from another organisation is never readable, whichever route names it.
describe("tenant isolation by object id (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  const runId = Date.now();
  const orgIds: string[] = [];

  beforeAll(async () => {
    process.env.MFA_SECRET_ENCRYPTION_KEY = process.env.MFA_SECRET_ENCRYPTION_KEY ?? "test-mfa-secret-encryption-key-32chars!!";
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
      await db.update(organisationMemberships).set({ deletedAt: new Date() }).where(eq(organisationMemberships.organisationId, id));
      await db.update(roleDefinitions).set({ deletedAt: new Date() }).where(eq(roleDefinitions.organisationId, id));
      await db.update(applicationUsers).set({ deletedAt: new Date() }).where(eq(applicationUsers.organisationId, id));
      await db.update(organisations).set({ deletedAt: new Date() }).where(eq(organisations.id, id));
    }
    await app.close();
  });

  async function owner(label: string) {
    const email = `e2e-iso-${label}-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({ organisationName: `E2E Isolation ${label} ${runId}`, sectorCode: "sme", acceptTerms: true, email, password: "blue tractor sings 123" })
      .expect(201);
    orgIds.push(created.body.organisationId);
    const user = await db.query.applicationUsers.findFirst({ where: and(eq(applicationUsers.email, email), isNull(applicationUsers.deletedAt)) });
    if (!user) throw new Error("owner missing");
    const raw = generateOpaqueToken();
    await db.insert(emailVerificationTokens).values({
      id: randomUUID(),
      organisationId: user.organisationId,
      userId: user.id,
      tokenHash: hashOpaqueToken(raw, "EMAIL_VERIFICATION_PEPPER"),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    const verified = await request(app.getHttpServer()).post("/auth/email-verification/verify").send({ token: raw }).expect(200);
    return { auth: { Authorization: `Bearer ${verified.body.accessToken as string}` }, organisationId: user.organisationId };
  }

  it("keeps a site, and a data request, of one organisation invisible to another", async () => {
    const a = await owner("a");
    const b = await owner("b");

    const site = await request(app.getHttpServer()).post("/sites").set(a.auth).send({ name: "Isolation reception" }).expect(201);
    const siteId = site.body.id as string;
    await request(app.getHttpServer()).get(`/sites/${siteId}`).set(a.auth).expect(200);
    const readOther = await request(app.getHttpServer()).get(`/sites/${siteId}`).set(b.auth);
    expect([403, 404]).toContain(readOther.status);
    const writeOther = await request(app.getHttpServer()).patch(`/sites/${siteId}`).set(b.auth).send({ name: "Taken" });
    expect([403, 404]).toContain(writeOther.status);

    const dsar = await request(app.getHttpServer())
      .post("/dsar")
      .set(a.auth)
      .send({ subjectReference: `person-${runId}@example.test`, requestTypeCode: "data_export" })
      .expect(201);
    for (const path of [`/dsar/${dsar.body.id}/package`, `/dsar/${dsar.body.id}/download`]) {
      const res = await request(app.getHttpServer()).get(path).set(b.auth);
      expect([403, 404]).toContain(res.status);
    }
    const resolve = await request(app.getHttpServer()).post(`/dsar/${dsar.body.id}/resolve`).set(b.auth).send({ resolution: "completed", reason: "not mine" });
    expect([403, 404]).toContain(resolve.status);

    const list = await request(app.getHttpServer()).get("/dsar").set(b.auth).expect(200);
    expect((list.body as Array<{ id: string }>).some((row) => row.id === dsar.body.id)).toBe(false);
  });
});
