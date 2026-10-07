import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { Public } from "../../common/decorators/public.decorator";
import { TypeDefinitionsService } from "./type-definitions.service";

// Authenticated (global JwtAuthGuard) but not permission-gated beyond that
// — this is config lookup data every role's dropdowns need, not a
// sensitive resource. No @RequirePermission means RbacGuard's permission
// check is a no-op for this route (see rbac.guard.ts: "route opted out of
// permission checking explicitly").
@Controller("type-definitions")
export class TypeDefinitionsController {
  constructor(private readonly typeDefinitionsService: TypeDefinitionsService) {}

  @Get()
  list(@Query("domain") domain: string | undefined) {
    if (!domain) throw new BadRequestException("domain query parameter is required");
    return this.typeDefinitionsService.listByDomain(domain);
  }
}

// Sign-up has no session, so the sector list it needs must be public. It is configuration, not tenant data.
@Controller("public")
export class PublicSectorsController {
  constructor(private readonly typeDefinitionsService: TypeDefinitionsService) {}

  @Public()
  @Get("organisation-sectors")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  organisationSectors() {
    return this.typeDefinitionsService.listOrganisationSectors();
  }
}
