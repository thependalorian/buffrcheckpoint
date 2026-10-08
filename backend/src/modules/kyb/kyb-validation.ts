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
    "This is not a format we recognise. A close corporation is usually written CC/2024/09322 and a company 2013/0456. Check it against your registration document.",
  registrationYear: "The year in the registration number looks wrong. Check it against your registration document.",
  registrationEntityMismatch: "The registration number format does not usually match the type of business you chose. Check both.",
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
  juristicNeedsRegistration: "A member that is a company or corporation needs its registration number.",
  roleUnknown: "Choose the role this person has in the business.",
  phoneShape: "This phone number does not look right. Use digits, with the country code if it is not a Namibian number.",
  tinShape: "A tax number uses letters and digits only, between 5 and 20 characters.",
  dateShape: "Enter the date as year-month-day, and not in the future.",
  peopleMissing: "Add the people behind the business: the owners, and for a company its directors.",
  ownersMissing: "Add at least one owner: a member of a close corporation, a shareholder of a company, or the proprietor.",
  percentageRequired: "Give each owner's share, so we can tell who counts as an owner.",
  ownerPhoneRequired: "Give each owner's phone number.",
  ownerEmailRequired: "Give each owner's email address.",
  postalShort: "The postal address looks too short.",
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

/**
 * No published specification of Namibian registration numbers was found (BIPA field dictionary), so a format that is unusual is a
 * warning for a person to check, never a refusal: a strict pattern would turn away real businesses.
 */
export function validateRegistrationNumber(raw: string, entityType?: string | null, now = new Date()): FieldIssue[] {
  const value = collapse(raw ?? "");
  if (!value) return [err("businessRegistrationNumber", "registrationRequired")];
  const normalised = normaliseRegistrationNumber(value);
  if (!/^[A-Z0-9/.-]{4,30}$/.test(normalised)) return [err("businessRegistrationNumber", "registrationFormat")];
  const inferred = inferEntityType(normalised);
  if (!inferred) {
    // Government bodies, non-profits and sole proprietors register differently: a plausible token is fine.
    const other = entityType && ["government_body", "non_profit", "sole_proprietor", "other"].includes(entityType);
    return other ? [] : [warn("businessRegistrationNumber", "registrationFormat")];
  }
  const year = Number(normalised.match(/(\d{4})/)?.[1]);
  if (year < 1900 || year > now.getUTCFullYear()) return [warn("businessRegistrationNumber", "registrationYear")];
  if (entityType === "close_corporation" && inferred !== "close_corporation") return [warn("businessRegistrationNumber", "registrationEntityMismatch")];
  if ((entityType === "private_company" || entityType === "public_company") && inferred !== "private_company") {
    return [warn("businessRegistrationNumber", "registrationEntityMismatch")];
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

/**
 * Namibian identity number: 11 digits. Its internal structure is not published, so only the length and digits are checked and a birth
 * date is never derived from it (BIPA field dictionary).
 */
export function validateNamibianId(raw: string, field = "identityNumber"): { issues: FieldIssue[] } {
  const digits = (raw ?? "").replace(/\s+/g, "");
  return /^\d{11}$/.test(digits) ? { issues: [] } : { issues: [err(field, "idLength")] };
}

export const PARTY_ROLES = ["member", "director", "shareholder", "secretary", "accounting_officer", "other"] as const;

export interface MemberInput {
  fullName: string;
  role?: string;
  isJuristic?: boolean;
  registrationNumber?: string;
  identityNumber?: string;
  percentage?: number | null;
  phone?: string;
  email?: string;
}

/** Roles that hold an interest in the business. */
const OWNERSHIP_ROLES = ["member", "shareholder"];

/**
 * Who is behind the business (owner decision 2026-10-08): every business names its owners, with each owner's share, phone number and
 * email. A company also names its directors. Owners are members and shareholders (or a person with no role given).
 */
export function validateMembers(members: MemberInput[] | undefined, entityType?: string | null): FieldIssue[] {
  void entityType;
  if (!members || members.length === 0) return [err("members", "peopleMissing")];
  const issues: FieldIssue[] = [];
  const isOwner = (m: MemberInput) => !m.role || OWNERSHIP_ROLES.includes(m.role);
  members.forEach((m, i) => {
    if (m.role && !(PARTY_ROLES as readonly string[]).includes(m.role)) issues.push(err(`members.${i}.role`, "roleUnknown"));
    if (m.isJuristic) {
      if (!collapse(m.fullName ?? "")) issues.push(err(`members.${i}.fullName`, "memberName"));
      if (!collapse(m.registrationNumber ?? "")) issues.push(err(`members.${i}.registrationNumber`, "juristicNeedsRegistration"));
    } else {
      issues.push(...validatePersonName(m.fullName, `members.${i}.fullName`));
      if (m.identityNumber) issues.push(...validateNamibianId(m.identityNumber, `members.${i}.identityNumber`).issues);
    }
    if (m.percentage != null && (m.percentage < 0 || m.percentage > 100)) issues.push(err(`members.${i}.percentage`, "percentageRange"));
    if (isOwner(m)) {
      if (m.percentage == null) issues.push(err(`members.${i}.percentage`, "percentageRequired"));
      if (!(m.phone ?? "").trim()) issues.push(err(`members.${i}.phone`, "ownerPhoneRequired"));
      if (!(m.email ?? "").trim()) issues.push(err(`members.${i}.email`, "ownerEmailRequired"));
    }
    issues.push(...validatePhone(m.phone, `members.${i}.phone`));
    issues.push(...validateEmail(m.email ?? "", `members.${i}.email`));
  });
  const owners = members.filter(isOwner);
  if (owners.length === 0) issues.push(err("members", "ownersMissing"));
  if (entityType === "close_corporation" && owners.length > 0 && owners.every((m) => m.percentage != null)) {
    const total = owners.reduce((sum, m) => sum + (m.percentage ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) issues.push(warn("members", "percentageTotal"));
  }
  return issues;
}

export function validatePhone(raw: string | null | undefined, field = "contactPhone"): FieldIssue[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  const digits = value.replace(/[\s().-]/g, "").replace(/^\+/, "");
  return /^\d{7,15}$/.test(digits) ? [] : [err(field, "phoneShape")];
}

export function validateTin(raw: string | null | undefined): FieldIssue[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  return /^[A-Za-z0-9]{5,20}$/.test(value) ? [] : [err("tin", "tinShape")];
}

export function validateIncorporationDate(raw: string | null | undefined, now = new Date()): FieldIssue[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  const date = new Date(`${value}T00:00:00Z`);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= now && date.getUTCFullYear() >= 1900;
  return ok ? [] : [err("incorporatedOn", "dateShape")];
}

export interface KybFieldsInput {
  entityType?: string | null;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  registeredAddress: string;
  authorizedSignatoryName: string;
  financialYearEnd?: string | null;
  postalAddress?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  tin?: string | null;
  incorporatedOn?: string | null;
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
  if (input.postalAddress && collapse(input.postalAddress).length < 6) issues.push(warn("postalAddress", "postalShort"));
  issues.push(...validateEmail(input.contactEmail ?? "", "contactEmail"));
  issues.push(...validatePhone(input.contactPhone));
  issues.push(...validateTin(input.tin));
  issues.push(...validateIncorporationDate(input.incorporatedOn, now));
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
