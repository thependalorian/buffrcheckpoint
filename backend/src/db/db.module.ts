import { Global, Module } from "@nestjs/common";

import { db } from "./client";
import { DB } from "./db.token";
import { TypeDefinitionLookupService } from "./type-definition-lookup.service";

export { DB };

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }, TypeDefinitionLookupService],
  exports: [DB, TypeDefinitionLookupService],
})
export class DbModule {}
