// Split from db.module.ts to break an import cycle: db.module.ts needs
// TypeDefinitionLookupService (to register it as a provider), and
// TypeDefinitionLookupService needs the DB injection token — putting the
// token in its own file lets both import it without importing each other.
export const DB = Symbol("DB");
