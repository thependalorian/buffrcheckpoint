// Field and document validation for business verification. Pure functions so the same rules run on the API at submission, on the
// live check the admin form calls, and on the ops review screen. Namibian formats are checked; anything unusual is a warning for
// a person to look at, never a silent pass.

export type IssueSeverity = "error" | "warning";

export interface FieldIssue {
  field: string;
  code: string;
  message: string;
  severity: IssueSeverity;
}

export const ENTITY_TYPES = [
  "close_corporation",
  "private_company",
  "public_company",
  "non_profit",
  "sole_proprietor",
  "government_body",
  "other",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Document types that can prove the business is registered. At least one accepted proof is needed before approval. */
export const REGISTRATION_PROOF_TYPES = ["founding_statement", "registration_certificate", "amended_founding_statement"] as const;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MIN_DOCUMENT_BYTES = 1024;

const MESSAGES = {
  registrationRequired: "Enter the registration number.",
  registrationFormat:
    "This does not look like a Namibian registration number. A close corporation looks like CC/2024/09322 and a company like 2013/0456.",
  registrationYear: "The year in the registration number is not possible.",
  registrationEntityMismatch: "The registration number format does not match the type of business you chose.",
  nameRequired: "Enter the registered business name exactly as it appears on the registration document.",
  nameLength: "The business name must be between 2 and 200 characters.",
  nameSuffixCc: "A close corporation name normally ends with CC.",
  nameSuffixCompany: "A private company name normally ends with (PTY) LTD or LIMITED.",
  addressRequired: "Enter the registered office address.",
  addressShort: "The address looks too short. Include the street, the erf or unit and the town.",
  addressPoBox: "The registered office must be a street address, not a post office box.",
  signatoryRequired: "Enter the full name of the person authorised to act for the business.",
  signatoryShape: "Enter the first name and surname, using letters only.",
  emailFormat: "This email address does not look right.",
  idLength: "A Namibian identity number has 11 digits.",
  idDate: "The first six digits of the identity number are not a real date of birth.",
  percentageRange: "A percentage must be between 0 and 100.",
  percentageTotal: "The members' percentages should add up to 100.",
  memberName: "Enter the member's full name.",
  entityRequired: "Choose the type of business.",
  yearEndShape: "Describe the financial year end, for example 28 February each year.",
  documentType: "Only PDF, PNG and JPEG files are accepted.",
  documentSize: "The file must be larger than 1 KB and no larger than 10 MB.",
  documentEmpty: "The file is empty.",
} as const;

const err = (field: string, code: keyof typeof MESSAGES): FieldIssue => ({ field, code, message: MESSAGES[code], severity: "error" });
const warn = (field: string, code: keyof typeof MESSAGES): FieldIssue => ({ field, code, message: MESSAGES[code], severity: "warning" });

export function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Upper-case, no spaces; "CC 2024 09322", "cc2024/09322" and "CC-2024-09322" all become CC/2024/09322. */
export function normaliseRegistrationNumber(value: string): string {
  const compact = value.toUpperCase().replace(/[\s\\-]+/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
  const m = compact.match(/^(CC)\/?(\d{4})\/?(\d{3,6})$/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const c = compact.match(/^(\d{4})\/?(\d{3,6})$/);
  if (c) return `${c[1]}/${c[2]}`;
  return compact;
}

export function inferEntityType(registrationNumber: string): EntityType | null {
  const n = normaliseRegistrationNumber(registrationNumber);
  if (/^CC\/\d{4}\/\d{3,6}$/.test(n)) return "close_corporation";
  if (/^\d{4}\/\d{3,6}$/.test(n)) return "private_company";
  return null;
}

export function validateRegistrationNumber(raw: string, entityType?: string | null, now = new Date()): FieldIssue[] {
  const value = collapse(raw ?? "");
  if (!value) return [err("businessRegistrationNumber", "registrationRequired")];
  const normalised = normaliseRegistrationNumber(value);
  const inferred = inferEntityType(normalised);
  if (!inferred) {
    // Government bodies, non-profits and sole proprietors register differently; accept a plausible token but ask for a look.
    if (entityType && ["government_body", "non_profit", "sole_proprietor", "other"].includes(entityType) && /^[A-Z0-9/.-]{4,30}$/.test(normalised)) {
      return [];
    }
    return [err("businessRegistrationNumber", "registrationFormat")];
  }
  const year = Number(normalised.match(/(\d{4})/)?.[1]);
  if (year < 1900 || year > now.getUTCFullYear()) return [err("businessRegistrationNumber", "registrationYear")];
  if (entityType === "close_corporation" && inferred !== "close_corporation") return [err("businessRegistrationNumber", "registrationEntityMismatch")];
  if ((entityType === "private_company" || entityType === "public_company") && inferred !== "private_company") {
    return [err("businessRegistrationNumber", "registrationEntityMismatch")];
  }
  return [];
}

export function validateBusinessName(raw: string, entityType?: string | null): FieldIssue[] {
  const value = collapse(raw ?? "");
  if (!value) return [err("registeredBusinessName", "nameRequired")];
  if (value.length < 2 || value.length > 200) return [err("registeredBusinessName", "nameLength")];
  const upper = value.toUpperCase();
  if (entityType === "close_corporation" && !/\bCC$/.test(upper)) return [warn("registeredBusinessName", "nameSuffixCc")];
  if (entityType === "private_company" && !/(\(PTY\)\s*LTD\.?|PTY\s*LTD\.?|LIMITED|LTD\.?)$/.test(upper)) {
    return [warn("registeredBusinessName", "nameSuffixCompany")];
  }
  return [];
}

export function validateAddress(raw: string, field = "registeredAddress"): FieldIssue[] {
  const value = collapse(raw ?? "");
  if (!value) return [err(field, "addressRequired")];
  if (/\b(P\.?\s*O\.?\s*BOX|POST\s*BOX|PRIVATE\s*BAG)\b/i.test(value)) return [err(field, "addressPoBox")];
  if (value.length < 10 || value.split(/[\s,]+/).filter(Boolean).length < 3) return [err(field, "addressShort")];
  return [];
}

export function validatePersonName(raw: string, field = "authorizedSignatoryName"): FieldIssue[] {
  const value = collapse(raw ?? "");
  if (!value) return [err(field, field === "authorizedSignatoryName" ? "signatoryRequired" : "memberName")];
  const words = value.split(" ");
  if (words.length < 2 || !words.every((w) => /^[\p{L}][\p{L}'.-]*$/u.test(w))) return [err(field, "signatoryShape")];
  return [];
}

export function validateEmail(raw: string, field: string): FieldIssue[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(value) ? [] : [err(field, "emailFormat")];
}

/** Namibian identity number: YYMMDD plus five digits. Returns the issues and the date of birth when it can be worked out. */
export function validateNamibianId(raw: string, field = "identityNumber", now = new Date()): { issues: FieldIssue[]; dateOfBirth?: string } {
  const digits = (raw ?? "").replace(/\s+/g, "");
  if (!/^\d{11}$/.test(digits)) return { issues: [err(field, "idLength")] };
  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  const currentYy = now.getUTCFullYear() % 100;
  const century = yy > currentYy ? 1900 : 2000;
  const date = new Date(Date.UTC(century + yy, mm - 1, dd));
  const valid = date.getUTCFullYear() === century + yy && date.getUTCMonth() === mm - 1 && date.getUTCDate() === dd && date <= now;
  if (!valid) return { issues: [err(field, "idDate")] };
  return { issues: [], dateOfBirth: date.toISOString().slice(0, 10) };
}

export interface MemberInput {
  fullName: string;
  identityNumber?: string;
  percentage?: number | null;
}

export function validateMembers(members: MemberInput[] | undefined, entityType?: string | null): FieldIssue[] {
  if (!members || members.length === 0) return [];
  const issues: FieldIssue[] = [];
  members.forEach((m, i) => {
    issues.push(...validatePersonName(m.fullName, `members.${i}.fullName`));
    if (m.identityNumber) issues.push(...validateNamibianId(m.identityNumber, `members.${i}.identityNumber`).issues);
    if (m.percentage != null && (m.percentage < 0 || m.percentage > 100)) issues.push(err(`members.${i}.percentage`, "percentageRange"));
  });
  if (entityType === "close_corporation" && members.every((m) => m.percentage != null)) {
    const total = members.reduce((sum, m) => sum + (m.percentage ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) issues.push(warn("members", "percentageTotal"));
  }
  return issues;
}

export interface KybFieldsInput {
  entityType?: string | null;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registeredAddress: string;
  authorizedSignatoryName: string;
  financialYearEnd?: string | null;
  members?: MemberInput[];
}

export function validateKybFields(input: KybFieldsInput, now = new Date()): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (!input.entityType || !(ENTITY_TYPES as readonly string[]).includes(input.entityType)) issues.push(err("entityType", "entityRequired"));
  issues.push(...validateRegistrationNumber(input.businessRegistrationNumber, input.entityType, now));
  issues.push(...validateBusinessName(input.registeredBusinessName, input.entityType));
  issues.push(...validateAddress(input.registeredAddress));
  issues.push(...validatePersonName(input.authorizedSignatoryName));
  if (input.financialYearEnd && collapse(input.financialYearEnd).length < 3) issues.push(warn("financialYearEnd", "yearEndShape"));
  issues.push(...validateMembers(input.members, input.entityType));
  return issues;
}

export function hasErrors(issues: FieldIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

export type DetectedFileType = "pdf" | "png" | "jpeg";

/** Decides the type from the first bytes, never from the file name or the browser's claim. */
export function detectFileType(buffer: Buffer): DetectedFileType | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  return null;
}

export const CONTENT_TYPES: Record<DetectedFileType, string> = { pdf: "application/pdf", png: "image/png", jpeg: "image/jpeg" };

export function validateDocumentFile(buffer: Buffer): { issues: FieldIssue[]; type?: DetectedFileType } {
  if (buffer.length === 0) return { issues: [err("file", "documentEmpty")] };
  if (buffer.length < MIN_DOCUMENT_BYTES || buffer.length > MAX_DOCUMENT_BYTES) return { issues: [err("file", "documentSize")] };
  const type = detectFileType(buffer);
  if (!type) return { issues: [err("file", "documentType")] };
  return { issues: [], type };
}

/** A file name safe to store and to put in a download header. */
export function safeFileName(name: string, type: DetectedFileType): string {
  const base = (name ?? "").replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}._ -]+/gu, "").replace(/^[.\s]+/, "").trim().slice(0, 80) || "document";
  const ext = type === "jpeg" ? "jpg" : type;
  return `${base}.${ext}`;
}

/** Comparison key for "is this the same name or address": upper case, letters and digits only. */
export function comparisonKey(value: string): string {
  return (value ?? "").toUpperCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export type CrossCheckResult = "match" | "mismatch" | "not_read";

export interface CrossCheck {
  field: string;
  label: string;
  result: CrossCheckResult;
  typed: string;
  fromDocument: string | null;
}

/** What the person typed against what the document says. A mismatch is for a reviewer to resolve, not an automatic rejection. */
export function crossCheck(
  typed: { businessRegistrationNumber: string; registeredBusinessName: string; registeredAddress: string },
  fromDocument: { registrationNumber?: string | null; businessName?: string | null; registeredAddress?: string | null } | null,
): CrossCheck[] {
  const rows: Array<[string, string, string, string | null | undefined, (v: string) => string]> = [
    ["businessRegistrationNumber", "Registration number", typed.businessRegistrationNumber, fromDocument?.registrationNumber, (v) => comparisonKey(normaliseRegistrationNumber(v))],
    ["registeredBusinessName", "Business name", typed.registeredBusinessName, fromDocument?.businessName, comparisonKey],
    ["registeredAddress", "Registered address", typed.registeredAddress, fromDocument?.registeredAddress, comparisonKey],
  ];
  return rows.map(([field, label, typedValue, doc, key]) => ({
    field,
    label,
    typed: typedValue,
    fromDocument: doc ?? null,
    result: !doc ? "not_read" : key(typedValue) === key(doc) ? "match" : "mismatch",
  }));
}
