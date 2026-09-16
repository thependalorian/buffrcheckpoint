import { Module } from "@nestjs/common";

import { OrganisationDirectoryController } from "./organisation-directory.controller";
import { OrganisationDirectoryService } from "./organisation-directory.service";

@Module({
  controllers: [OrganisationDirectoryController],
  providers: [OrganisationDirectoryService],
  exports: [OrganisationDirectoryService],
})
export class OrganisationDirectoryModule {}
