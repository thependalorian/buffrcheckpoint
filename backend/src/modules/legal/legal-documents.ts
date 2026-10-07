/**
 * The agreements an organisation accepts, and the version of each that is current. The text lives on the website (`/terms`,
 * `/privacy`); this file only names the documents and carries the default version. Legal can change a version without a deploy by
 * writing the platform setting `legal_documents` (for example `{ "terms": { "version": "2027-01-15" } }`); everyone is then asked to
 * accept the new one.
 *
 * Acceptances are written to the append-only, hash-linked audit chain as `agreement.accepted:<document>:<version>`, so the
 * record of who accepted what, and when, is the same tamper-evident trail the rest of the product relies on.
 */
export const LEGAL_DOCUMENTS = {
  terms: { label: "Terms and Conditions", path: "/terms", version: "2026-10-07" },
  privacy: { label: "Privacy Policy", path: "/privacy", version: "2026-10-07" },
} as const;

export type LegalDocumentCode = keyof typeof LEGAL_DOCUMENTS;

export const LEGAL_DOCUMENT_CODES = Object.keys(LEGAL_DOCUMENTS) as LegalDocumentCode[];

/** The documents every organisation owner accepts when creating an account. */
export const SIGNUP_DOCUMENTS: readonly LegalDocumentCode[] = ["terms", "privacy"];

export const AGREEMENT_ACTION_PREFIX = "agreement.accepted:";

const VERSION_PATTERN = /^[0-9A-Za-z._-]{1,40}$/;

export function isLegalDocument(value: unknown): value is LegalDocumentCode {
  return typeof value === "string" && (LEGAL_DOCUMENT_CODES as string[]).includes(value);
}

export function isValidVersion(value: unknown): value is string {
  return typeof value === "string" && VERSION_PATTERN.test(value);
}

export function agreementActionCode(document: string, version: string): string {
  return `${AGREEMENT_ACTION_PREFIX}${document}:${version}`;
}
