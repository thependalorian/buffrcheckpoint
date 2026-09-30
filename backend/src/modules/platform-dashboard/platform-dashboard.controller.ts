import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";

import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { PlatformScoped } from "../../common/decorators/platform-scoped.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { DevicesService } from "../devices/devices.service";
import { CimsoIntegrationService } from "../integrations/cimso/cimso-integration.service";
import { OrganisationHealthService } from "../organisation-health/organisation-health.service";
import { SitesService } from "../sites/sites.service";
import { PlatformDashboardService } from "./platform-dashboard.service";

class PlatformDeviceStatusDto {
  @IsString()
  organisationId!: string;

  @IsString()
  statusCode!: string;

  @IsString()
  @MinLength(1)
  reason!: string;
}

class PlatformSiteStatusDto {
  @IsString()
  organisationId!: string;

  @IsString()
  statusCode!: string;
}

@Controller("platform/dashboard")
export class PlatformDashboardController {
  constructor(
    private readonly dashboard: PlatformDashboardService,
    private readonly health: OrganisationHealthService,
    private readonly devices: DevicesService,
    private readonly sites: SitesService,
    private readonly cimso: CimsoIntegrationService,
  ) {}

  @Get("overview")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  overview() {
    return this.dashboard.overview();
  }

  @Get("recent-activity")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  recentActivity() {
    return this.dashboard.recentActivity();
  }

  @Get("regions")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  regions() {
    return this.dashboard.regionalBreakdown();
  }

  @Get("organisations")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  organisations() {
    return this.dashboard.listOrganisations();
  }

  @Get("churn-queue")
  @RequirePermission(PERMISSIONS.PLATFORM_ORG_HEALTH_READ)
  churnQueue() {
    return this.health.churnQueue();
  }

  @Get("incident-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  incidentTrend() {
    return this.dashboard.incidentVolumeTrend();
  }

  @Get("ticket-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  ticketTrend() {
    return this.dashboard.ticketVolumeTrend();
  }

  @Get("account-segmentation")
  @RequirePermission(PERMISSIONS.PLATFORM_ORG_HEALTH_READ)
  accountSegmentation() {
    return this.dashboard.accountSegmentation();
  }

  @Get("devices")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  allDevices(@Query("organisationId") organisationId?: string) {
    return this.devices.listAllPlatform(organisationId);
  }

  @Get("sites")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  allSites(@Query("organisationId") organisationId?: string) {
    return this.sites.listAllPlatform(organisationId);
  }

  @Get("organisations/:id/health-history")
  @RequirePermission(PERMISSIONS.PLATFORM_ORG_HEALTH_READ)
  @PlatformScoped()
  healthHistory(@Param("id") id: string) {
    return this.health.listSnapshotHistory(id);
  }

  @Get("organisations/:id/devices")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  orgDevices(@Param("id") id: string) {
    return this.devices.listForOrganisation(id);
  }

  @Get("organisations/:id/sites")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  orgSites(@Param("id") id: string) {
    return this.sites.listForOrganisation(id);
  }

  @Get("organisations/:id/pms-integrations")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  orgPmsIntegrations(@Param("id") id: string) {
    return this.cimso.listForOrganisation(id);
  }

  @Get("devices/:deviceId")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  deviceById(@Param("deviceId") deviceId: string, @Query("organisationId") organisationId: string) {
    return this.devices.getByIdForOrganisation(deviceId, organisationId);
  }

  @Get("devices/:deviceId/status-history")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  deviceStatusHistory(@Param("deviceId") deviceId: string, @Query("organisationId") organisationId: string) {
    return this.devices.statusHistoryForOrganisation(deviceId, organisationId);
  }

  @Post("devices/:deviceId/status")
  @RequirePermission(PERMISSIONS.PLATFORM_DEVICE_MANAGE)
  @PlatformScoped()
  setDeviceStatus(
    @Param("deviceId") deviceId: string,
    @Body() dto: PlatformDeviceStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.setStatusForOrganisation(
      deviceId,
      dto.organisationId,
      dto.statusCode,
      dto.reason,
      user.userId,
    );
  }

  @Get("sites/:siteId")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  siteById(@Param("siteId") siteId: string, @Query("organisationId") organisationId: string) {
    return this.sites.getByIdForOrganisation(siteId, organisationId);
  }

  @Get("sites/:siteId/devices")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  @PlatformScoped()
  siteDevices(@Param("siteId") siteId: string, @Query("organisationId") organisationId: string) {
    return this.devices.listForSite(siteId, organisationId);
  }

  @Patch("sites/:siteId/status")
  @RequirePermission(PERMISSIONS.PLATFORM_DEVICE_MANAGE)
  @PlatformScoped()
  setSiteStatus(@Param("siteId") siteId: string, @Body() dto: PlatformSiteStatusDto) {
    return this.sites.setStatusForOrganisation(siteId, dto.organisationId, dto.statusCode);
  }

  @Get("retention-curve")
  @RequirePermission(PERMISSIONS.PLATFORM_ORG_HEALTH_READ)
  retentionCurve() {
    return this.dashboard.retentionCurve();
  }

  @Get("visit-volume-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  visitVolumeTrend() {
    return this.dashboard.visitVolumeTrend();
  }

  @Get("mrr-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  mrrTrend() {
    return this.dashboard.billingMrrTrend();
  }

  @Get("invoiced-revenue-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_BILLING_MANAGE)
  invoicedRevenueTrend() {
    return this.dashboard.invoicedRevenueTrend();
  }

  @Get("kyb-throughput-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_KYB_REVIEW)
  kybThroughputTrend() {
    return this.dashboard.kybThroughputTrend();
  }

  @Get("notification-delivery-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  notificationDeliveryTrend() {
    return this.dashboard.notificationDeliveryTrend();
  }

  @Get("device-compliance-shares")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  deviceComplianceShares() {
    return this.dashboard.deviceComplianceShares();
  }

  @Get("ticket-resolution-trend")
  @RequirePermission(PERMISSIONS.PLATFORM_TICKET_MANAGE)
  ticketResolutionTrend() {
    return this.dashboard.ticketResolutionTimeTrend();
  }

  /** Cross-tenant offline/pending picture — ops Devices KPI (server-visible backlog only). */
  @Get("device-backlog")
  @RequirePermission(PERMISSIONS.PLATFORM_DASHBOARD_READ)
  deviceBacklog() {
    return this.dashboard.deviceBacklogSummary();
  }
}
