import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { typeDefinition } from "../../db/schema";

@Injectable()
export class TypeDefinitionsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  // Read-only config lookup — every admin dropdown/select should read this
  // instead of a hardcoded frontend list, per Section 11.4.5's "adding a
  // value is an INSERT, never a migration" rule (a hardcoded frontend list
  // would silently reintroduce the migration coupling that rule exists to
  // avoid).
  async listByDomain(domain: string) {
    return this.db.query.typeDefinition.findMany({
      where: and(eq(typeDefinition.domain, domain), isNull(typeDefinition.deletedAt)),
      orderBy: [asc(typeDefinition.sortOrder)],
    });
  }

  /**
   * The organisation sectors for sign-up and the profile page, in configured display order. Every sector is its own code;
   * nothing is merged or grouped here, because analytics count organisations by sector code.
   */
  async listOrganisationSectors() {
    const rows = await this.listByDomain("organisation_sector");
    return rows.map((row) => ({ code: row.code, label: row.label }));
  }
}
