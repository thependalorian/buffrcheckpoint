import ExcelJS from "exceljs";

import { parseExportFormat, type TabularExport, toCsv, toXlsx } from "./tabular";

const table: TabularExport = {
  headers: ["visitor_name", "status", "check_ins"],
  rows: [
    ["A. N.", "checked_in", 3],
    ['Quote "inside", comma', "checked_out", 0],
    ['=HYPERLINK("http://x")', null, 1],
    ["-2+3", "checked_in", 2],
  ],
};

describe("tabular export", () => {
  it("writes the same header and row count to CSV and XLSX", async () => {
    const csvLines = toCsv(table).trimEnd().split("\n");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await toXlsx(table, "Sheet")) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Sheet");
    if (!sheet) throw new Error("Sheet missing from workbook");

    expect(csvLines).toHaveLength(table.rows.length + 1);
    expect(sheet.rowCount).toBe(table.rows.length + 1);
    expect(csvLines[0]).toBe(table.headers.join(","));
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual(table.headers);
    expect(sheet.getRow(2).getCell(3).value).toBe(3);
  });

  it("quotes CSV special characters and neutralises formula-leading text", () => {
    const lines = toCsv(table).trimEnd().split("\n");

    expect(lines[2]).toBe('"Quote ""inside"", comma",checked_out,0');
    expect(lines[3]).toBe(`"'=HYPERLINK(""http://x"")",,1`);
    expect(lines[4]).toBe("'-2+3,checked_in,2");
  });

  it("stores formula-looking text as a plain string in XLSX", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await toXlsx(table, "Sheet")) as unknown as ArrayBuffer);
    const cell = workbook.getWorksheet("Sheet")?.getRow(4).getCell(1);

    expect(cell?.type).toBe(ExcelJS.ValueType.String);
    expect(cell?.value).toBe('=HYPERLINK("http://x")');
  });

  it("defaults unknown formats to CSV", () => {
    expect(parseExportFormat(undefined)).toBe("csv");
    expect(parseExportFormat("pdf")).toBe("csv");
    expect(parseExportFormat("xlsx")).toBe("xlsx");
  });
});
