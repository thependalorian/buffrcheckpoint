import { Global, Module } from "@nestjs/common";

import { PersonalDataProtectionService } from "./personal-data-protection.service";

@Global()
@Module({
  providers: [PersonalDataProtectionService],
  exports: [PersonalDataProtectionService],
})
export class DataProtectionModule {}
