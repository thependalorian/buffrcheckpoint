import { Module } from "@nestjs/common";

import { IdentityVerificationController } from "./identity-verification.controller";
import { IdentityVerificationOrchestratorService } from "./identity-verification-orchestrator.service";
import { IdentityVerificationService } from "./identity-verification.service";
import { DiginamRelyingPartyVerificationProvider } from "./providers/diginam-relying-party-verification.provider";
import { DiscoveryIdentityVerificationProvider } from "./providers/discovery-identity-verification.provider";

@Module({
  controllers: [IdentityVerificationController],
  providers: [
    IdentityVerificationService,
    IdentityVerificationOrchestratorService,
    DiscoveryIdentityVerificationProvider,
    DiginamRelyingPartyVerificationProvider,
  ],
  exports: [IdentityVerificationService, IdentityVerificationOrchestratorService],
})
export class IdentityVerificationModule {}
