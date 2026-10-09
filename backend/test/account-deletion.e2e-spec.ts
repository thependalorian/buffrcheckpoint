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
  dataDispositionTask,
  deletionRecoveryTombstone,
  emailVerificationTokens,
  organisationMemberships,
  organisations,
  privacyRequests,
  roleDefinitions,
  sites,
} from "../src/db/schema";
import { TypeDefinitionLookupService } from "../src/db/type-definition-lookup.service";
import { TokenIssuerService } from "../src/modules/auth/token-issuer.service";
import { randomUUID } from "node:crypto";

jest.setTimeout(90_000);

// DL-2, DL-3, DL-5, DL-7, DL-8, DL-10: an accepted deletion ends access at once, runs one task per system, keeps financial and audit
// records, writes a tombstone, and a repeat changes nothing.
describe("account deletion workflow (e2e)", () => {
  let app: INestApplication<App>;
  let db: Database;
  let tokens: TokenIssuerService;
  let typeDefs: TypeDefinitionLookupService;
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
    tokens = moduleFixture.get(TokenIssuerService);
    typeDefs = moduleFixture.get(TypeDefinitionLookupService);
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

  async function owner(label = "a") {
    const email = `e2e-del-owner-${label}-${runId}@example.test`;
    const created = await request(app.getHttpServer())
      .post("/onboarding/organisation-admin")
      .send({
        organisationName: `E2E Deletion ${label} ${runId}`,
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
    if (!user) throw new Error("owner missing");
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
    return { user, accessToken: verified.body.accessToken as string };
  }

  it("ends access at acceptance, completes every task, keeps records, writes a tombstone, and is idempotent", async () => {
    const { user: ownerUser, accessToken } = await owner();
    const auth = { Authorization: `Bearer ${accessToken}` };

    // A second person in the organisation, with a live token.
    const staffEmail = `e2e-del-staff-${runId}@example.test`;
    const staffId = randomUUID();
    await db.insert(applicationUsers).values({
      id: staffId,
      organisationId: ownerUser.organisationId,
      email: staffEmail,
      passwordHash: null,
      emailVerifiedAt: new Date(),
    });
    const staffToken = await tokens.sign(
      {
        sub: staffId,
        organisationId: ownerUser.organisationId,
        siteId: null,
        roleCode: "front_desk_operator",
        permissions: [],
        emailVerified: true,
        mfaEnabled: false,
        aud: "admin",
      },
      3600,
    );
    await request(app.getHttpServer()).get("/auth/me").set("Authorization", `Bearer ${staffToken}`).expect(200);

    const filed = await request(app.getHttpServer())
      .post("/dsar")
      .set(auth)
      .send({ subjectReference: staffEmail, requestTypeCode: "account_deletion" })
      .expect(201);
    const requestId = filed.body.id as string;

    // Accept: access ends at once, before any task finishes (DL-5).
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const accepted = await request(app.getHttpServer()).post(`/dsar/${requestId}/accept`).set(auth).expect(201);
    expect(accepted.body.state).toBe("scheduled");
    await request(app.getHttpServer()).get("/auth/me").set("Authorization", `Bearer ${staffToken}`).expect(401);

    const resolved = await request(app.getHttpServer())
      .post(`/dsar/${requestId}/resolve`)
      .set(auth)
      .send({ resolution: "completed", reason: "identity confirmed" })
      .expect(201);
    expect(resolved.body.resolution).toBe("completed");

    const staff = await db.query.applicationUsers.findFirst({ where: eq(applicationUsers.id, staffId) });
    expect(staff?.email).toBe(`erased-${staffId}@erased.invalid`);
    expect(staff?.deletedAt).not.toBeNull();

    const tasks = await db.select().from(dataDispositionTask).where(eq(dataDispositionTask.requestId, requestId));
    expect(tasks).toHaveLength(6);
    const statusCodes = await Promise.all(tasks.map((t) => typeDefs.codeById(t.statusCode)));
    expect(statusCodes.filter((s) => s === "retained_under_policy")).toHaveLength(2);
    expect(statusCodes.filter((s) => s === "completed")).toHaveLength(3);
    expect(statusCodes.filter((s) => s === "not_applicable")).toHaveLength(1);

    const tombstones = await db
      .select()
      .from(deletionRecoveryTombstone)
      .where(eq(deletionRecoveryTombstone.requestId, requestId));
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0].subjectHmac).toMatch(/^[0-9a-f]{64}$/);
    expect(tombstones[0].subjectHmac).not.toContain(staffId);

    const row = await db.query.privacyRequests.findFirst({ where: eq(privacyRequests.id, requestId) });
    expect(row?.subjectReference).toBe(`erased-${staffId}@erased.invalid`);

    // A repeat changes nothing.
    await request(app.getHttpServer())
      .post(`/dsar/${requestId}/resolve`)
      .set(auth)
      .send({ resolution: "completed", reason: "again" })
      .expect(201);
    const again = await db.select().from(dataDispositionTask).where(eq(dataDispositionTask.requestId, requestId));
    expect(again).toHaveLength(6);
  });

  it("refuses to accept a deletion without a fresh sign-in (DL-3)", async () => {
    const { user: ownerUser, accessToken } = await owner("b");
    const filed = await request(app.getHttpServer())
      .post("/dsar")
      .set({ Authorization: `Bearer ${accessToken}` })
      .send({ subjectReference: `someone-${runId}@example.test`, requestTypeCode: "account_deletion" })
      .expect(201);

    // A token issued an hour ago is a valid session but not a fresh sign-in.
    const realNow = tokens.clock;
    tokens.clock = () => Date.now() - 3_600_000;
    const stale = await tokens.sign(
      {
        sub: ownerUser.id,
        organisationId: ownerUser.organisationId,
        siteId: null,
        roleCode: "owner_operator",
        permissions: ["dsar.manage"],
        emailVerified: true,
        mfaEnabled: false,
        aud: "admin",
      },
      24 * 3600,
    );
    tokens.clock = realNow;

    const refused = await request(app.getHttpServer())
      .post(`/dsar/${filed.body.id}/accept`)
      .set({ Authorization: `Bearer ${stale}` })
      .expect(403);
    expect(refused.body.code).toBe("step_up_required");
  });
});
