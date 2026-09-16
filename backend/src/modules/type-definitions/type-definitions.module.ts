import { Module } from "@nestjs/common";

import { TypeDefinitionsController } from "./type-definitions.controller";
import { TypeDefinitionsService } from "./type-definitions.service";

@Module({
  controllers: [TypeDefinitionsController],
  providers: [TypeDefinitionsService],
  exports: [TypeDefinitionsService],
})
export class TypeDefinitionsModule {}
