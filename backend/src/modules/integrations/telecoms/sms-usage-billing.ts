/**
 * Pure rules for billing text messages by use. Money is held in whole cents until it is written out, so no floating point ever touches
 * an amount (NUMERIC(15,2) in the database, two decimal places on the invoice).
 */

/** Platform default until the owner changes it with the setting `sms_unit_price:default`: N$1.00 a text message sent. */
export const DEFAULT_SMS_UNIT_PRICE = "1.00";
export const SMS_CURRENCY_CODE = "NAD";

const AMOUNT = /^\d{1,9}\.\d{2}$/;

/** "1.00" to 100. Returns null for anything that is not a plain amount with two decimals. */
export function amountToCents(amount: string): number | null {
  if (!AMOUNT.test(amount)) return null;
  const [whole, fraction] = amount.split(".");
  return Number(whole) * 100 + Number(fraction);
}

/** 150 to "1.50". */
export function centsToAmount(cents: number): string {
  const whole = Math.trunc(cents / 100);
  return `${whole}.${String(cents % 100).padStart(2, "0")}`;
}

/** The amount for `count` messages at `unitPrice`, as a two-decimal string. */
export function usageAmount(count: number, unitPrice: string): string {
  const cents = amountToCents(unitPrice);
  if (cents === null) throw new Error(`Invalid SMS unit price "${unitPrice}"`);
  return centsToAmount(count * cents);
}

export interface BillingMonth {
  /** "2026-10". */
  key: string;
  /** Midnight at the start of the month in Windhoek (UTC+2), as an instant. */
  start: Date;
  /** Midnight at the start of the next month in Windhoek: the exclusive end. */
  end: Date;
  /** "October 2026". */
  label: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WINDHOEK_OFFSET_MS = 2 * 3_600_000;

/** Parses "2026-10". Returns null for anything else. */
export function parseBillingMonth(key: string): BillingMonth | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return {
    key,
    start: new Date(Date.UTC(year, month, 1) - WINDHOEK_OFFSET_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - WINDHOEK_OFFSET_MS),
    label: `${MONTH_NAMES[month]} ${year}`,
  };
}

/** The billing month that contains `now` in Windhoek. */
export function currentBillingMonth(now = new Date()): BillingMonth {
  const local = new Date(now.getTime() + WINDHOEK_OFFSET_MS);
  const key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
  return parseBillingMonth(key) as BillingMonth;
}

/** A month can be invoiced only once it has ended, so a late text can never be missed. */
export function isMonthClosed(month: BillingMonth, now = new Date()): boolean {
  return now.getTime() >= month.end.getTime();
}

/** One invoice per organisation per month: the unique invoice number is what makes billing a month twice impossible. */
export function smsUsageInvoiceNumber(organisationId: string, month: BillingMonth): string {
  return `SMS-${organisationId.replace(/-/g, "").slice(0, 8).toUpperCase()}-${month.key.replace("-", "")}`;
}
