/**
 * Personalisation and signature for a transactional email. The greeting uses the recipient's name when we know it; the signature says
 * which part of Buffr Checkpoint is writing (the team, billing, support) and where replies go. Both are added to the plain text (the
 * canonical part) and drawn in the HTML, so the two parts always say the same thing.
 */
export interface EmailSignature {
  name: string;
  role?: string;
}

export type SignatureKey = "team" | "billing" | "support" | "none";

export const SIGNATURES: Readonly<Record<Exclude<SignatureKey, "none">, EmailSignature>> = {
  team: { name: "The Buffr Checkpoint team" },
  billing: { name: "Buffr Checkpoint Billing", role: "Accounts" },
  support: { name: "Buffr Checkpoint Support", role: "Customer support" },
};

export function signatureFor(key: SignatureKey | undefined): EmailSignature | null {
  return key === "none" ? null : SIGNATURES[key ?? "team"];
}

/** A name safe to put in a greeting: one line, no control characters, no markup, not an email address. */
export function cleanName(value: string | null | undefined): string | null {
  const name = (value ?? "")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters from a name is the point
    .replace(/[\u0000-\u001f\u007f<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return name && !name.includes("@") ? name : null;
}

export function greetingLine(recipientName?: string | null): string {
  const name = cleanName(recipientName);
  return name ? `Hello ${name},` : "Hello,";
}

/** Contact details are not repeated here: the HTML footer carries them, and the Reply-To header carries them for plain-text readers. */
export function signatureText(signature: EmailSignature | null): string {
  if (!signature) return "";
  return ["Kind regards,", signature.role ? `${signature.name}, ${signature.role}` : signature.name].join("\n");
}

/** The full plain-text message: greeting, the template body, signature. */
export function composePlainText(input: {
  greeting: string | null;
  body: string;
  signature: EmailSignature | null;
}): string {
  return `${[input.greeting, input.body.trim(), signatureText(input.signature)]
    .filter((part) => part && part.length > 0)
    .join("\n\n")}\n`;
}

/** A body that already opens with its own greeting ("Hi Maria,", "Dear customer") must not get a second one. */
export function hasGreeting(body: string): boolean {
  return /^\s*(hello|hi|hey|dear|good (morning|afternoon|evening))\b/i.test(body);
}
