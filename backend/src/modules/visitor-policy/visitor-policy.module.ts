import { Module } from "@nestjs/common";

import { VisitorPolicyAcknowledgementsController, VisitorPolicyController } from "./visitor-policy.controller";
import { VisitorPolicyService } from "./visitor-policy.service";

@Module({
  controllers: [VisitorPolicyController, VisitorPolicyAcknowledgementsController],
  providers: [VisitorPolicyService],
  exports: [VisitorPolicyService],
})
export class VisitorPolicyModule {}
