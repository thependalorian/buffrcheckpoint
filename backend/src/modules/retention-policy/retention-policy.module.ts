import { Module } from "@nestjs/common";

import { RetentionPolicyController } from "./retention-policy.controller";
import { RetentionPolicyService } from "./retention-policy.service";

@Module({
  controllers: [RetentionPolicyController],
  providers: [RetentionPolicyService],
  exports: [RetentionPolicyService],
})
export class RetentionPolicyModule {}
