import { collapse, inferEntityType, normaliseRegistrationNumber } from "./kyb-validation";

// Reads the text of a Namibian CC1 founding statement (or a similar registration document) and suggests the registration details.
// The text normally comes from OCR of a scan, so every value is a suggestion with a confidence level; a person always confirms.

export type Confidence = "high" | "medium" | "low";

export interface ExtractedValue {
  value: string;
  confidence: Confidence;
}

export interface ExtractedMember {
  fullName: string;
  percentage: number | null;
  /** Read from a second engine that is better at digits; low confidence, a person confirms it. */
  identityNumber?: string;
}

export interface ExtractedRegistration {
  registrationNumber?: ExtractedValue;
  businessName?: ExtractedValue;
  registeredAddress?: ExtractedValue;
  postalAddress?: ExtractedValue;
  principalBusiness?: ExtractedValue;
  financialYearEnd?: ExtractedValue;
  contactEmail?: ExtractedValue;
  entityType?: ExtractedValue;
  members: ExtractedMember[];
  looksLikeFoundingStatement: boolean;
}

const LABEL_NOISE = /^[\s_|:.\-~=*]+/;

function lines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
}

const NOT_VALUE_LINE = /REPUBLIC|AUTHORITY|FOUNDING|REGISTRATION|CORPORATION|PART\s+[A-C]\b|MEMBERS/;

/** Upper-case lines directly above a label (up to three): OCR often prints the first lines of a multi-line answer above its label. */
function capsLinesAbove(all: string[], index: number, max = 3): string[] {
  const out: string[] = [];
  for (let k = index - 1; k >= 0 && out.length < max; k--) {
    const line = all[k].trim();
    if (!line || /[a-z]/.test(line) || NOT_VALUE_LINE.test(line)) break;
    out.unshift(line);
  }
  return out;
}

/** The text after a label on its line. With `multiline`, the upper-case lines above it are part of the answer. */
function valueAfter(all: string[], label: RegExp, multiline = false): string | null {
  for (let i = 0; i < all.length; i++) {
    const m = all[i].match(label);
    if (!m) continue;
    let rest = all[i].slice((m.index ?? 0) + m[0].length).replace(LABEL_NOISE, "").trim();
    if (multiline) rest = [...capsLinesAbove(all, i), rest].filter(Boolean).join(" ");
    if (!rest) {
      const next = (all[i + 1] ?? "").trim();
      if (next && !/^[A-Z][a-z]/.test(next)) rest = next;
    }
    return rest ? collapse(rest) : null;
  }
  return null;
}

function registrationCandidates(text: string): string[] {
  const found: string[] = [];
  const spaced = text.replace(/[|\\[\]()]/g, " ");
  for (const m of spaced.matchAll(/\bCC\s*[/\s]*\s*((?:19|20)\d{2})\s*[/\s]*\s*(\d{4,6})\b/gi)) found.push(`CC/${m[1]}/${m[2].slice(-5)}`);
  // OCR often reads the slash as a digit: 2024/09322 becomes 2024109322. Take the year and the last five digits.
  for (const m of spaced.matchAll(/\b((?:19|20)\d{2})\D?\d?(\d{5})\b/g)) {
    if (m[0].length >= 9) found.push(`CC/${m[1]}/${m[2]}`);
  }
  return found;
}

/** Handwritten numbers are the hardest thing to OCR. Read the digits near a "registration number" label and rebuild CC/yyyy/nnnnn from them. */
function nearbyRegistrationNumbers(all: string[], now = new Date()): string[] {
  const found: string[] = [];
  for (let i = 0; i < all.length; i++) {
    if (!/REGISTRATION\s*NUMBER/i.test(all[i])) continue;
    for (let j = i; j <= Math.min(i + 3, all.length - 1); j++) {
      const digits = all[j].replace(/REGISTRATION\s*NUMBER(\s*OF\s*CORPORATION)?/gi, "").replace(/[^0-9]/g, "");
      if (digits.length < 7 || digits.length > 10) continue;
      const sequence = digits.slice(-5);
      const head = digits.slice(0, -5);
      let year: number | null = null;
      if (head.startsWith("20") && head.length >= 4) year = Number(head.slice(0, 4));
      else if (head.length >= 2) year = 2000 + Number(head.slice(0, 2));
      if (year && year >= 2000 && year <= now.getUTCFullYear()) found.push(`CC/${year}/${sequence}`);
    }
  }
  return found;
}

/** Identity numbers written in the boxes of a members page: a line with the label and then exactly 11 digits. */
function identityNumbersFrom(all: string[]): string[] {
  const found: string[] = [];
  for (const line of all) {
    if (!/Identity\s*number/i.test(line)) continue;
    const rest = line.replace(/Identity\s*number\s*or\s*date\s*of\s*birth\s*(?:\(i\))?/i, "").trim();
    if (/^[\d\s]+$/.test(rest) && rest.replace(/\s/g, "").length === 11) found.push(rest.replace(/\s/g, ""));
  }
  return found;
}

/** A postal address is often printed above or below its label; find the "PO BOX" line next to it when the label has no text. */
function postalAddressFrom(all: string[]): string | null {
  for (let i = 0; i < all.length; i++) {
    const m = all[i].match(/Postal\s+address\s*\*?/i);
    if (!m) continue;
    const same = all[i].slice((m.index ?? 0) + m[0].length).replace(LABEL_NOISE, "").trim();
    if (same) return collapse(same);
    for (let k = Math.max(0, i - 3); k <= Math.min(all.length - 1, i + 3); k++) {
      if (/^\s*(P\.?\s?O\.?\s*BOX|PRIVATE\s+BAG)\b/i.test(all[k])) return collapse(all[k]);
    }
  }
  return null;
}

/**
 * `text` is the main reading (good word spacing). `precise`, when given, is a second reading that is better at digits and addresses
 * written by hand but loses spaces between words: it is used only for the registration number, identity numbers and email.
 */
export function parseRegistrationText(text: string, precise?: string): ExtractedRegistration {
  const all = lines(text);
  const preciseLines = precise ? lines(precise) : [];
  const upper = text.toUpperCase();
  const looksLikeFoundingStatement = /FOUNDING\s+STATEMENT/.test(upper) || /CLOSE\s+CORPORATIONS?\s+ACT/.test(upper);
  const result: ExtractedRegistration = { members: [], looksLikeFoundingStatement };

  // Registration number: the value that appears most often wins; a number seen on several pages is more likely right.
  const tally = new Map<string, number>();
  // An explicit CC/yyyy/nnnn in either reading is trusted over any digit repair. Repair only runs when neither reading has one,
  // because it assumes a five-digit sequence and would turn a four-digit one into a different, wrong number.
  const explicit = registrationCandidates(text);
  const explicitPrecise = precise ? registrationCandidates(precise) : [];
  if (explicit.length > 0 || explicitPrecise.length > 0) {
    for (const c of explicit) tally.set(normaliseRegistrationNumber(c), (tally.get(normaliseRegistrationNumber(c)) ?? 0) + 1);
    for (const c of explicitPrecise) tally.set(normaliseRegistrationNumber(c), (tally.get(normaliseRegistrationNumber(c)) ?? 0) + 2);
  } else {
    for (const c of nearbyRegistrationNumbers(all)) tally.set(normaliseRegistrationNumber(c), (tally.get(normaliseRegistrationNumber(c)) ?? 0) + 1);
    // The second reading reads handwritten digits better, so its vote counts double.
    for (const c of nearbyRegistrationNumbers(preciseLines)) tally.set(normaliseRegistrationNumber(c), (tally.get(normaliseRegistrationNumber(c)) ?? 0) + 2);
  }
  const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best) result.registrationNumber = { value: best[0], confidence: best[1] >= 2 ? "medium" : "low" };

  if (/CLOSE\s+CORPORATIONS?\s+ACT/.test(upper)) result.entityType = { value: "close_corporation", confidence: "high" };
  else if (/COMPANIES\s+ACT/.test(upper)) result.entityType = { value: "private_company", confidence: "medium" };
  else if (result.registrationNumber) {
    const inferred = inferEntityType(result.registrationNumber.value);
    if (inferred) result.entityType = { value: inferred, confidence: "low" };
  }

  const name = valueAfter(all, /Full\s+name\s+of\s+corporation/i);
  if (name) result.businessName = { value: name.toUpperCase(), confidence: "high" };

  const address = valueAfter(all, /Address\s+of\s+registered\s+office\s*(?:\([^)]*\))?/i, true);
  if (address) result.registeredAddress = { value: address.toUpperCase(), confidence: "medium" };

  const business = valueAfter(all, /Description\s+of\s+principal\s+business/i, true);
  if (business) result.principalBusiness = { value: business.toUpperCase(), confidence: "medium" };

  const yearEnd = valueAfter(all, /Date\s+of\s+end\s+of\s+financial\s+year/i);
  if (yearEnd) result.financialYearEnd = { value: yearEnd.toUpperCase(), confidence: "high" };

  const emailPattern = /Email\s*address\s*:?\s*([^\s@]+@[^\s@]+\.[A-Za-z]{2,})/i;
  const email = (precise ? precise.match(emailPattern) : null) ?? text.match(emailPattern);
  if (email) result.contactEmail = { value: email[1].toLowerCase(), confidence: precise && precise.match(emailPattern) ? "medium" : "low" };

  const postal = postalAddressFrom(all);
  if (postal) result.postalAddress = { value: postal.toUpperCase(), confidence: "medium" };

  // Members: the name after "Full names and surname" in the members part, with the percentage on the lines that follow it.
  const seen = new Set<string>();
  for (let i = 0; i < all.length; i++) {
    const m = all[i].match(/Full\s+names?\s+and\s+sur\w{2,6}\s*(.*)$/i);
    if (!m) continue;
    // The name is the run of upper-case words after the label; stamps, dates and OCR litter after it are ignored.
    const memberName = m[1].replace(LABEL_NOISE, "").match(/^[A-Z][A-Z'.-]+(?:\s+[A-Z][A-Z'.-]+)+/)?.[0] ?? "";
    if (!memberName || seen.has(memberName)) continue;
    let percentage: number | null = null;
    for (let j = i + 1; j < Math.min(i + 12, all.length); j++) {
      if (/Full\s+names?\s+and\s+sur\w{2,6}/i.test(all[j])) break;
      const p = all[j].match(/Percentage\s+of\s+interest\s*[:_]?\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
      if (p) {
        percentage = Number(p[1]);
        break;
      }
    }
    seen.add(memberName);
    result.members.push({ fullName: memberName, percentage });
  }
  const ids = identityNumbersFrom(preciseLines);
  result.members.forEach((member, index) => {
    if (ids[index]) member.identityNumber = ids[index];
  });

  return result;
}

/** The fields the form fills from the document, as flat suggestions with their confidence. */
export function toSuggestions(extracted: ExtractedRegistration): Record<string, ExtractedValue> {
  const out: Record<string, ExtractedValue> = {};
  if (extracted.registrationNumber) out.businessRegistrationNumber = extracted.registrationNumber;
  if (extracted.businessName) out.registeredBusinessName = extracted.businessName;
  if (extracted.registeredAddress) out.registeredAddress = extracted.registeredAddress;
  if (extracted.principalBusiness) out.principalBusiness = extracted.principalBusiness;
  if (extracted.financialYearEnd) out.financialYearEnd = extracted.financialYearEnd;
  if (extracted.postalAddress) out.postalAddress = extracted.postalAddress;
  if (extracted.contactEmail) out.contactEmail = extracted.contactEmail;
  if (extracted.entityType) out.entityType = extracted.entityType;
  return out;
}
