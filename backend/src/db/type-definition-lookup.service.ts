import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "./client";
import { DB } from "./db.token";
import { typeDefinition } from "./schema";

// type_definition rows are seeded config (backend/db/seed/0001_type_definitions.sql),
// never hardcoded UUIDs in application code — this service is the one place
// that resolves a (domain, code) pair to the row id, with a short in-memory
// cache since these rows essentially never change at runtime.
@Injectable()
export class TypeDefinitionLookupService {
  private readonly cache = new Map<string, string>();
  private readonly idCache = new Map<string, string>();

  constructor(@Inject(DB) private readonly db: Database) {}

  async id(domain: string, code: string): Promise<string> {
    const key = `${domain}:${code}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const row = await this.db.query.typeDefinition.findFirst({
      where: and(eq(typeDefinition.domain, domain), eq(typeDefinition.code, code), isNull(typeDefinition.deletedAt)),
    });

    if (!row) {
      throw new InternalServerErrorException(
        `type_definition row not found for domain='${domain}' code='${code}' — has it been seeded? See backend/db/seed/0001_type_definitions.sql`,
      );
    }

    this.cache.set(key, row.id);
    this.idCache.set(row.id, row.code);
    return row.id;
  }

  async codeById(typeDefinitionId: string): Promise<string | null> {
    const cached = this.idCache.get(typeDefinitionId);
    if (cached) return cached;

    const row = await this.db.query.typeDefinition.findFirst({
      where: and(eq(typeDefinition.id, typeDefinitionId), isNull(typeDefinition.deletedAt)),
    });
    if (!row) return null;

    this.idCache.set(row.id, row.code);
    this.cache.set(`${row.domain}:${row.code}`, row.id);
    return row.code;
  }
}
