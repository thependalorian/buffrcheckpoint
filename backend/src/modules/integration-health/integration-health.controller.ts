import { Controller, Get } from "@nestjs/common";

import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { IntegrationHealthService } from "./integration-health.service";

@Controller("platform/integrations")
export class IntegrationHealthController {
  constructor(private readonly health: IntegrationHealthService) {}

  @Get("health")
  @PlatformScoped()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  check() {
    return this.health.check();
  }
}
