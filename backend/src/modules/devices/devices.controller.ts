import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { IsString } from "class-validator";

import { AuditLog } from "../../common/decorators/audit-log.decorator";
import { type AuthenticatedUser, CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { RequireVerifiedEmail } from "../../common/decorators/require-verified-email.decorator";
import { PERMISSIONS } from "../../common/rbac/permissions";
import { DevicesService } from "./devices.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { UpdateDeviceStatusDto } from "./dto/update-device-status.dto";

class RetireDeviceDto {
  @IsString()
  reason!: string;
}

// Section 11.4.3's "Devices" / "Device Compliance Register" sidebar items
// (admin/src/navigation/sidebar/sidebar-items.ts) — no controller existed
// for this despite the device/device_status_log schema and DEVICE_MANAGE
// permission already being defined.
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "device.register", resourceType: "device" })
  create(@Body() dto: CreateDeviceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.create(dto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.list(user);
  }

  // Declared before ":id" — Nest matches routes in declaration order, so a
  // literal segment must come first or "backlog" resolves as a device id.
  @Get("backlog")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  backlog(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.backlogSummary(user);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  getById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.getById(id, user);
  }

  /** What a device support QR contains. The code opens an admin page that needs a sign-in and this permission, so it reveals nothing itself. */
  @Get(":id/support-qr")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  supportQr(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.supportQr(id, user);
  }

  @Get(":id/status-history")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  statusHistory(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.statusHistory(id, user);
  }

  @Post(":id/status")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "device.status_change", resourceType: "device" })
  setStatus(@Param("id") id: string, @Body() dto: UpdateDeviceStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.setStatus(id, dto.statusCode, dto.reason, user);
  }

  // Section 14.3a's deployability gate — the ACQUIRE->DEPLOY check. Stands
  // in for the kiosk's own device-authenticated activation call until the
  // kiosk app (Section 11.4.2 gap, out of scope this pass) exists.
  @Post(":id/activate")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  @AuditLog({ action: "device.activate", resourceType: "device" })
  activate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.activate(id, user);
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.DEVICE_MANAGE)
  @RequireVerifiedEmail()
  @AuditLog({ action: "device.retire", resourceType: "device" })
  retire(@Param("id") id: string, @Body() dto: RetireDeviceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.retire(id, dto.reason, user);
  }
}
