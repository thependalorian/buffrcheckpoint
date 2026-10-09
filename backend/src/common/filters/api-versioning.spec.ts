import { Controller, Get, type INestApplication, VERSION_NEUTRAL, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types";

@Controller("things")
class ThingsController {
  @Get()
  list() {
    return { items: [] };
  }
}

// API-6: a route answers both unversioned and under /v1, so the deployed kiosk keeps working while clients move.
describe("API versioning alias (API-6)", () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ThingsController] }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: [VERSION_NEUTRAL, "1"] });
    await app.init();
  });
  afterAll(() => app.close());

  it("serves the unversioned path", async () => {
    await request(app.getHttpServer()).get("/things").expect(200, { items: [] });
  });

  it("serves the same route under /v1", async () => {
    await request(app.getHttpServer()).get("/v1/things").expect(200, { items: [] });
  });
});
