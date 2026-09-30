/**
 * Minimal single-page PDF writer (text + simple header bar) — no pdfkit dependency.
 * Suitable for tax invoices and receipts with fixed layout.
 */

export function buildSimplePdf(lines: string[], title: string): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const content: string[] = [];
  let y = pageHeight - margin;

  // Mustard header bar (approximate RGB for #E0B000)
  content.push("0.878 0.690 0 rg");
  content.push(`${margin} ${pageHeight - 36} ${pageWidth - margin * 2} 8 re f`);
  content.push("0 0 0 rg");

  y = pageHeight - 60;
  content.push("BT");
  content.push("/F1 16 Tf");
  content.push(`${margin} ${y} Td`);
  content.push(`(${escapePdf(title)}) Tj`);
  content.push("ET");
  y -= 28;

  content.push("BT");
  content.push("/F1 10 Tf");
  content.push(`${margin} ${y} Td`);
  let first = true;
  for (const line of lines) {
    const chunks = wrapLine(line, 90);
    for (const chunk of chunks) {
      if (!first) {
        content.push("0 -14 Td");
        y -= 14;
      }
      first = false;
      content.push(`(${escapePdf(chunk)}) Tj`);
    }
  }
  content.push("ET");

  const stream = content.join("\n");
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
  objects.push(
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj`,
  );
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream endobj`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, max: number): string[] {
  if (line.length <= max) return [line || " "];
  const out: string[] = [];
  let rest = line;
  while (rest.length > max) {
    let breakAt = rest.lastIndexOf(" ", max);
    if (breakAt < max / 2) breakAt = max;
    out.push(rest.slice(0, breakAt));
    rest = rest.slice(breakAt).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}
