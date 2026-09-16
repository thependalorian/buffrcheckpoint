import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import { visitorIdentityAssessments, visitorVisits } from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import { randomUUID } from "node:crypto";

export interface RecordVerificationInput {
  visitId: string;
  providerCode: string; // e.g. 'diginam', 'nfc_badge', 'self_declared'
  assuranceLevelCode: string; // 'V0'..'V4'
  outcomeReference?: string;
  outcomeCode?: string;
  releasedAttributeCodes?: string[];
  expiresAt?: string;
}

@Injectable()
export class IdentityVerificationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  // Section 8.4's critical implementation rule: store only the verification
  // outcome and reference, never the full credential payload or biometric
  // data. This method's input shape enforces that at the type level —
  // there is no field here for a raw credential payload to flow through.
  async record(input: RecordVerificationInput, user: AuthenticatedUser) {
    const visitRow = await this.db.query.visitorVisits.findFirst({
      where: and(eq(visitorVisits.id, input.visitId), eq(visitorVisits.organisationId, user.organisationId)),
    });
    if (!visitRow) {
      throw new Error(`Visit ${input.visitId} not found in organisation ${user.organisationId}`);
    }

    const [providerCode, assuranceLevelCode] = await Promise.all([
      this.typeDefs.id("identity_verification_provider", input.providerCode),
      this.typeDefs.id("identity_assurance_level", input.assuranceLevelCode),
    ]);

    const [created] = await this.db
      .insert(visitorIdentityAssessments)
      .values({
        id: randomUUID(),
        visitId: input.visitId,
        verificationProviderCode: providerCode,
        assuranceLevelCode,
        outcomeReference: input.outcomeReference ?? null,
        outcomeCode: input.outcomeCode ?? null,
        releasedAttributeCodes: input.releasedAttributeCodes ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      })
      .returning();

    return created;
  }

  // No organisationId column on visitor_identity_assessments (Wiebe rule 8-
  // style: it's reachable via visit_id, not duplicated) — tenancy is
  // enforced by checking the visit belongs to the caller's organisation
  // first, same as record() above.
  async listForVisit(visitId: string, user: AuthenticatedUser) {
    const visitRow = await this.db.query.visitorVisits.findFirst({
      where: and(eq(visitorVisits.id, visitId), eq(visitorVisits.organisationId, user.organisationId)),
    });
    if (!visitRow) return [];

    return this.db.query.visitorIdentityAssessments.findMany({
      where: eq(visitorIdentityAssessments.visitId, visitId),
    });
  }
}
