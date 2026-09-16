import { Global, Module } from "@nestjs/common";

import { ScopedPermissionEvaluationService } from "./scoped-permission-evaluation.service";

// Global: RbacGuard (app.module.ts's APP_GUARD provider) and every module
// that issues a JWT (auth/, onboarding/) need this service, and it has no
// per-request state to scope — same rationale as DbModule being global.
@Global()
@Module({
  providers: [ScopedPermissionEvaluationService],
  exports: [ScopedPermissionEvaluationService],
})
export class AccessControlModule {}
