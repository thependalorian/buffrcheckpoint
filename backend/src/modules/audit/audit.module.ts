import { Module } from "@nestjs/common";

import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditChainVerifierService } from "./audit-chain-verifier.service";

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditChainVerifierService],
  exports: [AuditService],
})
export class AuditModule {}
