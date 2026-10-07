import { Body, Controller, Get, Patch, Post } from "@nestjs/common";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { CreateOrganisationDto } from "./dto/create-organisation.dto";
import { UpdateOrganisationDto } from "./dto/update-organisation.dto";
import { OrganisationsService } from "./organisations.service";

@Controller("organisations")
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  // No longer public: a brand-new customer's tenant is created atomically
  // by POST /onboarding/organisation-admin (modules/onboarding), which also
  // provisions the first Owner-Operator in the same transaction — the
  // client must never orchestrate tenant creation itself across two calls.
  // This endpoint remains only for Buffr Checkpoint's own internal staff to
  // manually provision a tenant (platform_support role only).
  @Post()
  @RequirePermission(PERMISSIONS.ORGANISATION_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation.create", resourceType: "organisation" })
  create(@Body() dto: CreateOrganisationDto) {
    return this.organisationsService.create(dto);
  }

  @Get("me")
  getOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.organisationsService.getOwn(user);
  }

  @Patch("me")
  @RequirePermission(PERMISSIONS.SITE_CONFIGURE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "organisation.update", resourceType: "organisation" })
  updateOwn(@Body() dto: UpdateOrganisationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.organisationsService.updateOwn(user, dto);
  }
}
