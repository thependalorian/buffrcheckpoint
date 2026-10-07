/**
 * Site notices: the two pieces of text a site publishes for people on the premises, each reached by a QR code.
 *   emergency   what to do in an emergency (assembly point, who to call). Read only, no sign-in, no visitor data.
 *   induction   the contractor safety induction. Read, then acknowledged on the contractor's own phone while checked in.
 * Both are stored as versioned, published policy documents, so there is a history, a content hash and an acknowledgement record,
 * and no new table. A site can have its own text (policy code "<code>:<siteId>"); without one the organisation-wide text is used.
 */
export type NoticeKind = "emergency" | "induction";

export const NOTICE_KINDS: Readonly<
  Record<
    NoticeKind,
    { policyCode: string; category: string; qrType: "emergency_info" | "contractor_induction"; title: string }
  >
> = {
  emergency: {
    policyCode: "emergency_information",
    category: "emergency",
    qrType: "emergency_info",
    title: "Emergency information",
  },
  induction: {
    policyCode: "contractor_induction",
    category: "induction",
    qrType: "contractor_induction",
    title: "Contractor induction",
  },
};

export const MIN_NOTICE_LENGTH = 20;
export const MAX_NOTICE_LENGTH = 20_000;

export function isNoticeKind(value: string): value is NoticeKind {
  return value === "emergency" || value === "induction";
}

/** Policy codes to try, most specific first: this site's own text, then the organisation-wide text. */
export function policyCodesFor(kind: NoticeKind, siteId: string | null | undefined): string[] {
  const base = NOTICE_KINDS[kind].policyCode;
  return siteId ? [`${base}:${siteId}`, base] : [base];
}

export class NoticeRuleError extends Error {}

/** Trims, normalises line breaks and refuses text that is empty, too short to be a notice, or too long. */
export function normaliseNoticeText(text: string | null | undefined): string {
  const cleaned = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (cleaned.length < MIN_NOTICE_LENGTH)
    throw new NoticeRuleError(`The notice needs at least ${MIN_NOTICE_LENGTH} characters`);
  if (cleaned.length > MAX_NOTICE_LENGTH)
    throw new NoticeRuleError(`The notice is longer than ${MAX_NOTICE_LENGTH} characters`);
  return cleaned;
}

export interface InductionEligibility {
  visitorTypeCode: string | null;
  checkedOut: boolean;
}

/**
 * Who may acknowledge the contractor induction: someone who is checked in right now as a contractor. The scope is the site (the QR
 * is site-bound), the visitor type, and the open visit. Anyone else is told why, without revealing whether a visit exists.
 */
export function inductionRefusal(visit: InductionEligibility | null): string | null {
  if (!visit || visit.checkedOut)
    return "No open visit was found for that phone at this site. Check in first, then open the induction.";
  if (visit.visitorTypeCode !== "contractor")
    return "This induction is for contractors. Your visit is not registered as a contractor visit; ask reception.";
  return null;
}
