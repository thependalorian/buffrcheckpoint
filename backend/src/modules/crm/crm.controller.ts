import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { type CreateContactInput, type CreateDealInput, CrmService, type UpdateContactInput } from "./crm.service";

// Every route here is platform-wide (Ops Console, platform_support-only) —
// organisationId is always the target org being *viewed*, not the caller's
// own, so every cross-org read/write is @PlatformScoped() (see
// platform-scoped.decorator.ts). The @RequirePermission platform.crm.manage
// gate is the real boundary, not TenantScopeGuard.
@Controller("platform/crm")
export class CrmController {
  constructor(private readonly service: CrmService) {}

  @Post("contacts")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  createContact(@Body() dto: CreateContactInput) {
    return this.service.createContact(dto);
  }

  @Get("contacts")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  listContacts(@Query("organisationId") organisationId: string) {
    return this.service.listContacts(organisationId);
  }

  @Get("contacts/:contactId")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  getContact(@Param("contactId") contactId: string) {
    return this.service.getContact(contactId);
  }

  @Patch("contacts/:contactId")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  updateContact(
    @Param("contactId") contactId: string,
    @Body() dto: UpdateContactInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateContact(contactId, dto, user);
  }

  @Post("deals")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  createDeal(@Body() dto: CreateDealInput, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createDeal(dto, user);
  }

  @Get("deals")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  listDeals(@Query("organisationId") organisationId?: string) {
    return organisationId ? this.service.listDealsForOrganisation(organisationId) : this.service.listDeals();
  }

  @Get("pipeline-value")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  pipelineValue() {
    return this.service.pipelineValueByStage();
  }

  @Get("deals/:dealId")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  getDealById(@Param("dealId") dealId: string) {
    return this.service.getDealById(dealId);
  }

  @Get("deals/:dealId/activity")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  dealActivity(@Param("dealId") dealId: string) {
    return this.service.dealActivityTimeline(dealId);
  }

  @Get("deals/:dealId/stage-history")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  dealStageHistory(@Param("dealId") dealId: string) {
    return this.service.dealStageHistory(dealId);
  }

  @Patch("deals/:dealId/stage")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  transitionDealStage(
    @Param("dealId") dealId: string,
    @Body() body: { stageCode: string; note?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transitionDealStage(dealId, body.stageCode, user, body.note);
  }

  @Post("activity")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  logActivity(
    @Body() body: { organisationId: string; activityType: string; note: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.logActivity(body.organisationId, body.activityType, body.note, user);
  }

  @Get("activity")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  listActivity(@Query("organisationId") organisationId: string) {
    return this.service.listActivity(organisationId);
  }

  @Patch("organisations/:organisationId/lifecycle-stage")
  @RequirePermission(PERMISSIONS.PLATFORM_CRM_MANAGE)
  @PlatformScoped()
  setLifecycleStage(@Param("organisationId") organisationId: string, @Body() body: { stageCode: string }) {
    return this.service.setLifecycleStage(organisationId, body.stageCode);
  }
}
