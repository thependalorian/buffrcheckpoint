import { Module } from "@nestjs/common";

import { DevicesModule } from "../devices/devices.module";
import { CredentialsController } from "./credentials.controller";
import { CredentialsService } from "./credentials.service";

@Module({
  imports: [DevicesModule],
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
