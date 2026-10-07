import { SMS_MAX_CHARACTERS } from "../integrations/telecoms/bulksmsnam.client";

/**
 * Text-message wording rules. A message with any character outside the GSM 7-bit alphabet is sent as UCS-2, which cuts a segment from
 * 160 to 70 characters and so costs several credits. This keeps every message in GSM 7-bit and one segment long, or refuses it.
 * Pure functions, so the rules are tested without a provider.
 */

const REPLACEMENTS: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
  "…": "...",
  " ": " ",
};

/** Printable ASCII plus newline, without the characters that cost two positions in GSM 7-bit (^ { } \ [ ~ ] |). */
const SAFE = /^[A-Za-z0-9 \n!"#%&'()*+,\-./:;<=>?@_$]$/;

/** Folds accents ("Mueller" for "Müller"), swaps typographic punctuation, and drops anything that cannot be sent in one segment. */
export function toGsm7(text: string): string {
  const folded = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’“”–—… ]/g, (ch) => REPLACEMENTS[ch] ?? "");
  return [...folded].filter((ch) => SAFE.test(ch)).join("");
}

/** {{token}} substitution, the same rule the email templates use. */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export interface FittedSms {
  text: string;
  /** True when the organisation name had to be shortened to fit. */
  shortened: boolean;
}

/**
 * Renders a body into one 160-character segment. Only the organisation name is ever shortened, down to 8 characters, because it is
 * the one variable of unpredictable length; links and references are never cut (a cut link is a broken link). Returns null when it
 * still does not fit, and the caller must not send.
 */
export function fitSms(body: string, variables: Record<string, string>): FittedSms | null {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) clean[key] = key.endsWith("Url") ? value : toGsm7(value);
  const full = toGsm7(fillTemplate(body, clean)).trim();
  if (full.length > 0 && full.length <= SMS_MAX_CHARACTERS) return { text: full, shortened: false };

  const name = clean.organisationName;
  if (name && name.length > 8) {
    const overflow = full.length - SMS_MAX_CHARACTERS;
    const keep = Math.max(8, name.length - overflow - 1);
    const shortenedName = `${name.slice(0, keep).trimEnd()}.`;
    const text = toGsm7(fillTemplate(body, { ...clean, organisationName: shortenedName })).trim();
    if (text.length > 0 && text.length <= SMS_MAX_CHARACTERS) return { text, shortened: true };
  }
  return null;
}
