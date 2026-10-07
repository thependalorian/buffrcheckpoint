/**
 * Gives a plain-text email body its structure. Template bodies stay plain text (they are edited by ops and are the canonical text
 * part of every message); this reads the shape that is already in them and says which parts are paragraphs, a table of facts, a
 * single action, a list or a warning, so the HTML version can lay each part out properly.
 *
 * Recognised, in this order, per blank-line-separated block:
 *   - a block that is only an image URL (https, png/jpg/gif/webp) -> a picture
 *   - a block that is only a URL                        -> an action button
 *   - two or more lines of `Label: value`               -> a facts table (a single short line too, when it is not a sentence)
 *   - lines starting `1)` or `1.`                       -> a numbered list;  lines starting `- ` -> a bulleted list
 *   - starts "If you did not", "If this was not" ...    -> a security callout
 *   - anything else                                     -> a paragraph
 */
export type EmailBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "facts"; rows: Array<{ label: string; value: string }> }
  | { kind: "image"; url: string; alt: string }
  | { kind: "action"; url: string; label: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "callout"; tone: "security" | "info"; text: string };

const URL_ONLY = /^https?:\/\/\S+$/;
const IMAGE_URL = /^https:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i;
const FACT = /^([A-Za-z][A-Za-z0-9 ()/&'-]{0,31}):\s+(\S.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const SECURITY_LEAD =
  /^(if you did not|if you didn't|if this was not|if this wasn't|if you do not recognise|if you don't recognise)/i;

export function structureBody(body: string, opts: { actionLabel?: string } = {}): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 1 && IMAGE_URL.test(lines[0])) {
      blocks.push({ kind: "image", url: lines[0], alt: "" });
      continue;
    }
    if (lines.length === 1 && URL_ONLY.test(lines[0])) {
      blocks.push({ kind: "action", url: lines[0], label: opts.actionLabel ?? "Open" });
      continue;
    }
    const facts = lines.map((l) => FACT.exec(l));
    const rows = facts.flatMap((m) => (m ? [{ label: m[1], value: m[2] }] : []));
    if (rows.length === lines.length && (lines.length >= 2 || !/[.!?]$/.test(lines[0]))) {
      // "https://x" would look like label "https" — a URL is never a label.
      if (!rows.some((row) => /^https?$/i.test(row.label))) {
        blocks.push({ kind: "facts", rows });
        continue;
      }
    }
    if (lines.every((l) => NUMBERED.test(l))) {
      blocks.push({ kind: "list", ordered: true, items: lines.map((l) => NUMBERED.exec(l)?.[1] ?? l) });
      continue;
    }
    if (lines.every((l) => BULLET.test(l))) {
      blocks.push({ kind: "list", ordered: false, items: lines.map((l) => BULLET.exec(l)?.[1] ?? l) });
      continue;
    }
    // A lead-in line followed by a list ("Outreach checklist:\n1) ...") is a paragraph and a list.
    const firstListLine = lines.findIndex((l) => NUMBERED.test(l) || BULLET.test(l));
    if (firstListLine > 0 && lines.slice(firstListLine).every((l) => NUMBERED.test(l) || BULLET.test(l))) {
      blocks.push({ kind: "paragraph", text: lines.slice(0, firstListLine).join("\n") });
      const ordered = NUMBERED.test(lines[firstListLine]);
      blocks.push({
        kind: "list",
        ordered,
        items: lines.slice(firstListLine).map((l) => (ordered ? NUMBERED : BULLET).exec(l)?.[1] ?? l),
      });
      continue;
    }
    blocks.push(
      SECURITY_LEAD.test(block)
        ? { kind: "callout", tone: "security", text: block }
        : { kind: "paragraph", text: block },
    );
  }
  return blocks;
}
