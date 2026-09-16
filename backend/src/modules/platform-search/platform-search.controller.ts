import { Controller, Get, Query } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { PlatformSearchService } from "./platform-search.service";

// The console's search box. The route-level permission is the floor (any
// console user); each category inside is gated on the permission guarding its
// own screen, so search cannot read a queue the caller cannot open.
@Controller("platform/search")
export class PlatformSearchController {
  constructor(private readonly service: PlatformSearchService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  search(@Query("q") term: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.search(term ?? "", user);
  }
}
