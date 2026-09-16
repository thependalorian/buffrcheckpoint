import { Module } from "@nestjs/common";

import { AccessPoliciesController } from "./access-policies.controller";
import { AccessPoliciesService } from "./access-policies.service";

@Module({
  controllers: [AccessPoliciesController],
  providers: [AccessPoliciesService],
})
export class AccessPoliciesModule {}
