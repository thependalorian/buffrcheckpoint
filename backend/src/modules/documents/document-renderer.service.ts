import { Injectable } from "@nestjs/common";

import { BRAND_COLORS, escapeHtml } from "../notifications/branded-email-layout";
import { buildSimplePdf } from "./simple-pdf";

export interface BillingParty {
  legalName: string;
  tradingName?: string;
  addressLines: string[];
  vatNumber?: string;
  registrationNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
}

export interface InvoiceDocumentInput {
  invoiceNumber: string;
  organisationName: string;
  issuedAt: Date;
  dueAt: Date | null;
  currencyCode: string;
  amount: string;
  lineItems: Array<{ description: string; quantity: number; amount: string }>;
  invoiceUrl?: string;
}

export interface ReceiptDocumentInput {
  receiptNumber: string;
  invoiceNumber: string;
  organisationName: string;
  paidAt: Date;
  currencyCode: string;
  amount: string;
  paymentMethodLabel: string;
  receiptUrl?: string;
}

/**
 * Bank details customers need to pay by transfer. `complete` is false when the
 * account number or branch code is not configured: invoices then go out
 * without them, which the ops integration health panel reports.
 */
export function bankPaymentInstructions(env: NodeJS.ProcessEnv = process.env) {
  const accountNumber = env.BILLING_BANK_ACCOUNT_NUMBER?.trim() || null;
  const branchCode = env.BILLING_BANK_BRANCH_CODE?.trim() || null;
  return {
    bankName: env.BILLING_BANK_NAME?.trim() || "Bank Windhoek",
    accountName: env.BILLING_BANK_ACCOUNT_NAME?.trim() || "Buffr Financial Services CC",
    accountNumber,
    branchCode,
    complete: Boolean(accountNumber && branchCode),
  };
}

@Injectable()
export class DocumentRendererService {
  issuer(): BillingParty {
    return {
      legalName: process.env.BILLING_LEGAL_NAME?.trim() || "Buffr Financial Services CC",
      tradingName: "Buffr Checkpoint",
      addressLines: (process.env.BILLING_ADDRESS ?? "Windhoek, Namibia").split("|").map((s) => s.trim()),
      vatNumber: process.env.BILLING_VAT_NUMBER?.trim(),
      registrationNumber: process.env.BILLING_REGISTRATION_NUMBER?.trim(),
      bankName: process.env.BILLING_BANK_NAME?.trim() || "Bank Windhoek",
      bankAccountName: process.env.BILLING_BANK_ACCOUNT_NAME?.trim() || "Buffr Financial Services CC",
      bankAccountNumber: process.env.BILLING_BANK_ACCOUNT_NUMBER?.trim() || "",
      bankBranchCode: process.env.BILLING_BANK_BRANCH_CODE?.trim() || "",
    };
  }

  renderInvoiceHtml(input: InvoiceDocumentInput): string {
    const issuer = this.issuer();
    const rows = input.lineItems
      .map(
        (li) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #E5E5E5;">${escapeHtml(li.description)}</td>
            <td style="padding:8px;border-bottom:1px solid #E5E5E5;text-align:right;">${li.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #E5E5E5;text-align:right;">${escapeHtml(li.amount)} ${escapeHtml(input.currencyCode)}</td>
          </tr>`,
      )
      .join("");

    return letterheadHtml({
      title: `Tax Invoice ${input.invoiceNumber}`,
      issuer,
      body: `
        <p style="margin:0 0 8px;"><strong>Bill to:</strong> ${escapeHtml(input.organisationName)}</p>
        <p style="margin:0 0 8px;">Issued: ${escapeHtml(input.issuedAt.toISOString().slice(0, 10))}</p>
        <p style="margin:0 0 16px;">Due: ${escapeHtml(input.dueAt ? input.dueAt.toISOString().slice(0, 10) : "On receipt")}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
          <thead>
            <tr style="background:${BRAND_COLORS.light};">
              <th style="text-align:left;padding:8px;">Description</th>
              <th style="text-align:right;padding:8px;">Qty</th>
              <th style="text-align:right;padding:8px;">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px 8px;text-align:right;font-weight:600;">Total due</td>
              <td style="padding:12px 8px;text-align:right;font-weight:600;">${escapeHtml(input.amount)} ${escapeHtml(input.currencyCode)}</td>
            </tr>
          </tfoot>
        </table>
        ${bankBlockHtml(issuer, input.invoiceNumber)}
        ${input.invoiceUrl ? `<p style="margin-top:16px;font-size:13px;">Online copy: ${escapeHtml(input.invoiceUrl)}</p>` : ""}
      `,
    });
  }

  renderReceiptHtml(input: ReceiptDocumentInput): string {
    const issuer = this.issuer();
    return letterheadHtml({
      title: `Receipt ${input.receiptNumber}`,
      issuer,
      body: `
        <p style="margin:0 0 8px;"><strong>Received from:</strong> ${escapeHtml(input.organisationName)}</p>
        <p style="margin:0 0 8px;">Invoice: ${escapeHtml(input.invoiceNumber)}</p>
        <p style="margin:0 0 8px;">Paid: ${escapeHtml(input.paidAt.toISOString().slice(0, 10))}</p>
        <p style="margin:0 0 8px;">Method: ${escapeHtml(input.paymentMethodLabel)}</p>
        <p style="margin:16px 0;font-size:18px;font-weight:600;">Amount received: ${escapeHtml(input.amount)} ${escapeHtml(input.currencyCode)}</p>
        <p style="font-size:13px;color:${BRAND_COLORS.muted};">This receipt confirms allocation of payment against the invoice above.</p>
        ${input.receiptUrl ? `<p style="margin-top:16px;font-size:13px;">Online copy: ${escapeHtml(input.receiptUrl)}</p>` : ""}
      `,
    });
  }

  renderInvoicePdf(input: InvoiceDocumentInput): Buffer {
    const issuer = this.issuer();
    const lines = [
      issuer.legalName,
      ...(issuer.tradingName ? [`Trading as ${issuer.tradingName}`] : []),
      ...issuer.addressLines,
      issuer.registrationNumber ? `Reg: ${issuer.registrationNumber}` : "",
      issuer.vatNumber ? `VAT: ${issuer.vatNumber}` : "",
      "",
      `Bill to: ${input.organisationName}`,
      `Issued: ${input.issuedAt.toISOString().slice(0, 10)}`,
      `Due: ${input.dueAt ? input.dueAt.toISOString().slice(0, 10) : "On receipt"}`,
      "",
      ...input.lineItems.map((li) => `${li.description}  x${li.quantity}  ${li.amount} ${input.currencyCode}`),
      "",
      `Total due: ${input.amount} ${input.currencyCode}`,
      "",
      "Pay by EFT:",
      issuer.bankName ? `Bank: ${issuer.bankName}` : "",
      issuer.bankAccountName ? `Account name: ${issuer.bankAccountName}` : "",
      issuer.bankAccountNumber ? `Account number: ${issuer.bankAccountNumber}` : "",
      issuer.bankBranchCode ? `Branch code: ${issuer.bankBranchCode}` : "",
      `Payment reference: ${input.invoiceNumber}`,
    ].filter((l) => l !== undefined) as string[];

    return buildSimplePdf(lines, `Tax Invoice ${input.invoiceNumber}`);
  }

  renderReceiptPdf(input: ReceiptDocumentInput): Buffer {
    const issuer = this.issuer();
    const lines = [
      issuer.legalName,
      ...issuer.addressLines,
      "",
      `Received from: ${input.organisationName}`,
      `Invoice: ${input.invoiceNumber}`,
      `Paid: ${input.paidAt.toISOString().slice(0, 10)}`,
      `Method: ${input.paymentMethodLabel}`,
      "",
      `Amount received: ${input.amount} ${input.currencyCode}`,
      "",
      "Thank you for your payment.",
    ];
    return buildSimplePdf(lines, `Receipt ${input.receiptNumber}`);
  }
}

function letterheadHtml(input: { title: string; issuer: BillingParty; body: string }): string {
  const issuer = input.issuer;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(input.title)}</title>
<style>
  @media print { body { margin: 0; } }
  body { font-family: system-ui, sans-serif; color: ${BRAND_COLORS.charcoal}; background: #fff; margin: 0; padding: 32px; }
  .bar { height: 6px; background: ${BRAND_COLORS.mustard}; margin: -32px -32px 24px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  .muted { color: ${BRAND_COLORS.muted}; font-size: 13px; line-height: 1.45; }
</style>
</head>
<body>
  <div class="bar"></div>
  <h1>${escapeHtml(input.title)}</h1>
  <div class="muted" style="margin-bottom:24px;">
    <strong>${escapeHtml(issuer.legalName)}</strong>
    ${issuer.tradingName ? `<br />Trading as ${escapeHtml(issuer.tradingName)}` : ""}
    ${issuer.addressLines.map((l) => `<br />${escapeHtml(l)}`).join("")}
    ${issuer.registrationNumber ? `<br />Reg: ${escapeHtml(issuer.registrationNumber)}` : ""}
    ${issuer.vatNumber ? `<br />VAT: ${escapeHtml(issuer.vatNumber)}` : ""}
  </div>
  ${input.body}
</body>
</html>`;
}

function bankBlockHtml(issuer: BillingParty, paymentReference: string): string {
  return `<div style="padding:16px;background:${BRAND_COLORS.light};border-radius:4px;font-size:14px;">
    <p style="margin:0 0 8px;font-weight:600;">Pay by EFT</p>
    ${issuer.bankName ? `<p style="margin:0 0 4px;">Bank: ${escapeHtml(issuer.bankName)}</p>` : ""}
    ${issuer.bankAccountName ? `<p style="margin:0 0 4px;">Account name: ${escapeHtml(issuer.bankAccountName)}</p>` : ""}
    ${issuer.bankAccountNumber ? `<p style="margin:0 0 4px;">Account number: ${escapeHtml(issuer.bankAccountNumber)}</p>` : ""}
    ${issuer.bankBranchCode ? `<p style="margin:0 0 4px;">Branch code: ${escapeHtml(issuer.bankBranchCode)}</p>` : ""}
    <p style="margin:8px 0 0;font-weight:600;">Payment reference: ${escapeHtml(paymentReference)}</p>
  </div>`;
}
