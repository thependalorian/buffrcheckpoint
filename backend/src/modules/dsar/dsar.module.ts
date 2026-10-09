import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { LegalHoldsModule } from "../legal-holds/legal-holds.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AccountDeletionService } from "./account-deletion.service";
import { DsarController } from "./dsar.controller";
import { DsarService } from "./dsar.service";

@Module({
  imports: [NotificationsModule, AuthModule, LegalHoldsModule],
  controllers: [DsarController],
  providers: [DsarService, AccountDeletionService],
  exports: [DsarService, AccountDeletionService],
})
export class DsarModule {}
