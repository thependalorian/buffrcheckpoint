import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module";
import { PlatformStaffController } from "./platform-staff.controller";
import { PlatformStaffService } from "./platform-staff.service";

// Buffr-internal staff administration for the Ops Console. Separate from
// RbacModule, which manages a *customer* organisation's own memberships.
@Module({
  imports: [NotificationsModule, PlatformConfigurationModule],
  controllers: [PlatformStaffController],
  providers: [PlatformStaffService],
  exports: [PlatformStaffService],
})
export class PlatformStaffModule {}
