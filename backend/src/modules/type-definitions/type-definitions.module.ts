import { Module } from "@nestjs/common";

import { PublicSectorsController, TypeDefinitionsController } from "./type-definitions.controller";
import { TypeDefinitionsService } from "./type-definitions.service";

@Module({
  controllers: [TypeDefinitionsController, PublicSectorsController],
  providers: [TypeDefinitionsService],
  exports: [TypeDefinitionsService],
})
export class TypeDefinitionsModule {}
