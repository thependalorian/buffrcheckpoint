import { Module } from "@nestjs/common";

import { OrganisationStandardsService } from "./organisation-standards.service";

@Module({
  providers: [OrganisationStandardsService],
  exports: [OrganisationStandardsService],
})
export class OrganisationStandardsModule {}
