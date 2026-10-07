import { TypeDefinitionsService } from "./type-definitions.service";

describe("TypeDefinitionsService.listOrganisationSectors", () => {
  it("returns one entry per sector code in configured order, with only code and label", async () => {
    const rows = [
      { id: "1", domain: "organisation_sector", code: "sme", label: "SME / corporate office", sortOrder: 0 },
      {
        id: "2",
        domain: "organisation_sector",
        code: "financial_services",
        label: "Banking, finance and insurance",
        sortOrder: 1,
      },
      {
        id: "3",
        domain: "organisation_sector",
        code: "energy_utilities",
        label: "Energy, mining and utilities",
        sortOrder: 11,
      },
    ];
    const findMany = jest.fn().mockResolvedValue(rows);
    const service = new TypeDefinitionsService({ query: { typeDefinition: { findMany } } } as never);

    const result = await service.listOrganisationSectors();

    expect(result).toEqual([
      { code: "sme", label: "SME / corporate office" },
      { code: "financial_services", label: "Banking, finance and insurance" },
      { code: "energy_utilities", label: "Energy, mining and utilities" },
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
