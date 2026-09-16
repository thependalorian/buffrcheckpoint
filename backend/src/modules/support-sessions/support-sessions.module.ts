import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PlatformConfigurationModule } from "../platform-configuration/platform-configuration.module";
import { SupportSessionsController } from "./support-sessions.controller";
import { SupportSessionsService } from "./support-sessions.service";

// Split out of the former platform-control-plane bundle (see
// ../rename-map.tsv) — the break-glass access/consent flow is its own
// security-sensitive surface, not a CRM/billing/incidents concern.
@Module({
  // JwtService (session minting), NotificationsService (consent-request
  // emails), PlatformNotificationTemplateService (that email's ops-editable copy).
  imports: [AuthModule, NotificationsModule, PlatformConfigurationModule],
  controllers: [SupportSessionsController],
  providers: [SupportSessionsService],
  exports: [SupportSessionsService],
})
export class SupportSessionsModule {}
