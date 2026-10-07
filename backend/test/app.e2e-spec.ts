import "dotenv/config";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";

import { AppModule } from "../src/app.module";

jest.setTimeout(60_000);

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET) is public and returns ok", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect({ status: "ok", service: "buffrcheckpoint-backend", database: "ok" });
  });

  it("a protected route without a token is rejected", () => {
    return request(app.getHttpServer()).get("/sites").expect(401);
  });

  it("/public/capability-status returns seven public capability keys", async () => {
    const res = await request(app.getHttpServer()).get("/public/capability-status").expect(200);
    expect(Object.keys(res.body).sort()).toEqual(
      [
        "cimsoInnterchange",
        "diginamVerification",
        "nationalEidNfc",
        "nfcBadgeCheckIn",
        "qrInvitationCheckIn",
        "smsContactConfirmation",
        "ussd",
      ].sort(),
    );
  });

  it("/public/organisation-sectors is public, lists the 14 sectors once each, flat, corporate first and Other last", async () => {
    const res = await request(app.getHttpServer()).get("/public/organisation-sectors").expect(200);
    const codes = (res.body as Array<{ code: string; label: string }>).map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toHaveLength(14);
    expect(codes[0]).toBe("sme");
    expect(codes[codes.length - 1]).toBe("other");
    expect(codes).toEqual(
      expect.arrayContaining([
        "financial_services",
        "government",
        "healthcare",
        "energy_utilities",
        "technology_telecom",
        "ngo_nonprofit",
        "religious_faith_based",
      ]),
    );
    // Retired codes must not come back.
    expect(codes).not.toEqual(expect.arrayContaining(["bank"]));
    expect(codes).not.toEqual(expect.arrayContaining(["critical_infrastructure"]));
    for (const row of res.body as Array<{ code: string; label: string }>)
      expect(Object.keys(row).sort()).toEqual(["code", "label"]);
  });

  it("/organisation/capability-enablement without token is 401 (route exists)", () => {
    return request(app.getHttpServer()).get("/organisation/capability-enablement").expect(401);
  });
});
