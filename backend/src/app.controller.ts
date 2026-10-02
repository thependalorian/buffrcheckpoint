import { Controller, Get, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";

import { Public } from "./common/decorators/public.decorator";
import type { Database } from "./db/client";
import { DB } from "./db/db.token";

const SERVICE = "buffrcheckpoint-backend";
const DB_PROBE_TIMEOUT_MS = 3000;

@Controller()
export class AppController {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Uptime monitors assert the service name and a 200. A 200 with a dead
  // database would hide an outage, so the database is probed and a failure
  // returns 503. No error detail is exposed on this public route.
  @Public()
  @Get("health")
  async health() {
    try {
      await Promise.race([
        this.db.execute(sql`SELECT 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), DB_PROBE_TIMEOUT_MS)),
      ]);
    } catch {
      throw new HttpException(
        { status: "degraded", service: SERVICE, database: "down" },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: "ok", service: SERVICE, database: "ok" };
  }
}
