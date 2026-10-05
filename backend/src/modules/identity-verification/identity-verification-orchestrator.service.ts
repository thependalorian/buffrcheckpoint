import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  platformCapabilityApprovals,
  typeDefinition,
  visitorIdentityAssessments,
  visitorVisits,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";
import type { VerifyIdentityDto } from "./dto/verify-identity.dto";
import { DiginamRelyingPartyVerificationProvider } from "./providers/diginam-relying-party-verification.provider";
import type { DigitalIdentityVerificationProvider } from "./providers/digital-identity-verification.provider";
import { DiscoveryIdentityVerificationProvider } from "./providers/discovery-identity-verification.provider";
import { randomUUID } from "node:crypto";

@Injectable()
export class IdentityVerificationOrchestratorService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
    private readonly discoveryProvider: DiscoveryIdentityVerificationProvider,
    private readonly diginamProvider: DiginamRelyingPartyVerificationProvider,
  ) {}

  private async resolveProvider(code?: string): Promise<DigitalIdentityVerificationProvider> {
    if (code === "diginam") {
      const diginamCap = await this.typeDefs.id("capability_code", "diginam_verification");
      const row = await this.db.query.platformCapabilityApprovals.findFirst({
        where: eq(platformCapabilityApprovals.capabilityCode, diginamCap),
      });
      if (row) {
        const status = await this.db.query.typeDefinition.findFirst({
          where: eq(typeDefinition.id, row.statusCode),
        });
        const allowed = status?.code === "approved" || status?.code === "pilot" || status?.code === "live";
        if (allowed) return this.diginamProvider;
      }
    }
    return this.discoveryProvider;
  }

  async verify(dto: VerifyIdentityDto, user: AuthenticatedUser) {
    const visitRow = await this.db.query.visitorVisits.findFirst({
      where: and(eq(visitorVisits.id, dto.visitId), eq(visitorVisits.organisationId, user.organisationId)),
    });
    if (!visitRow) {
      throw new Error(`Visit ${dto.visitId} not found in organisation ${user.organisationId}`);
    }

    const provider = await this.resolveProvider(dto.providerCode);
    const outcome = await provider.verifyVisitorIdentity({
      organisationId: user.organisationId,
      visitId: dto.visitId,
      requestedAssuranceLevelCode: dto.requestedAssuranceLevelCode,
      purposeCode: dto.purposeCode,
      relyingPartyReference: dto.relyingPartyReference,
    });

    const [providerCode, assuranceLevelCode] = await Promise.all([
      this.typeDefs.id("identity_verification_provider", outcome.providerCode),
      this.typeDefs.id("identity_assurance_level", outcome.assuranceLevelCode),
    ]);

    const [created] = await this.db
      .insert(visitorIdentityAssessments)
      .values({
        id: randomUUID(),
        visitId: dto.visitId,
        verificationProviderCode: providerCode,
        assuranceLevelCode,
        outcomeReference: outcome.providerVerificationReference,
        outcomeCode: outcome.outcomeCode,
        releasedAttributeCodes: outcome.releasedAttributeCodes,
        expiresAt: outcome.expiresAt ? new Date(outcome.expiresAt) : null,
      })
      .returning();

    return { assessment: created, outcome };
  }
}
