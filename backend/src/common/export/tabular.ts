import ExcelJS from "exceljs";

// One table shape for every downloadable export, serialised to CSV or XLSX.
// Services build the table; controllers pick the format. Both formats carry
// exactly the same header row and data rows.

export type TabularCell = string | number | null;

export interface TabularExport {
  headers: string[];
  rows: TabularCell[][];
}

export type ExportFormat = "csv" | "xlsx";

export function parseExportFormat(value: string | undefined): ExportFormat {
  return value === "xlsx" ? "xlsx" : "csv";
}

export const EXPORT_CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// Visitor names and free text are visitor-supplied. A text cell starting with
// = + - @ (or a tab/CR) is executed as a formula when the CSV is opened in a
// spreadsheet, so it is prefixed with an apostrophe. Numbers pass through.
function csvCell(value: TabularCell): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(table: TabularExport): string {
  const lines = [table.headers, ...table.rows].map((row) => row.map(csvCell).join(","));
  return `${lines.join("\n")}\n`;
}

// exceljs writes JavaScript strings as shared-string cells, never formulas, so
// the XLSX path needs no formula escaping.
export async function toXlsx(table: TabularExport, sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(table.headers).font = { bold: true };
  for (const row of table.rows) sheet.addRow(row.map((cell) => cell ?? ""));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function serialiseExport(table: TabularExport, format: ExportFormat, sheetName: string): Promise<Buffer> {
  return format === "xlsx" ? toXlsx(table, sheetName) : Buffer.from(toCsv(table), "utf8");
}
