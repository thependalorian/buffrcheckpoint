import { Module } from "@nestjs/common";

import { FormAiService } from "./form-ai.service";
import { VisitorDataMinimisationService } from "./visitor-data-minimisation.service";
import { VisitorPolicyAcknowledgementsController, VisitorPolicyController } from "./visitor-policy.controller";
import { VisitorPolicyService } from "./visitor-policy.service";

@Module({
  controllers: [VisitorPolicyController, VisitorPolicyAcknowledgementsController],
  providers: [VisitorPolicyService, VisitorDataMinimisationService, FormAiService],
  exports: [VisitorPolicyService, VisitorDataMinimisationService, FormAiService],
})
export class VisitorPolicyModule {}
