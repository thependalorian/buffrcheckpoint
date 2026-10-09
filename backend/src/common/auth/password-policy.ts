import { registerDecorator, type ValidationOptions } from "class-validator";

// Password policy for new passwords (choose, reset, create-account). Follows NIST SP 800-63B: length matters, composition rules and forced
// rotation do not, and spaces and any characters are allowed. The length is 12 to 128 characters (PW-2); Argon2id reads every character,
// so no passphrase is cut. Passwords set before this rule keep working at sign-in; the rule applies the next time one is chosen. A check
// against breached passwords is a separate step that needs a third-party lookup (buffrcheckpoint.md 17.6).

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** The rule in words, shown beside the field and returned when a password is refused. */
export const PASSWORD_RULE_TEXT = `Use at least ${PASSWORD_MIN_LENGTH} characters. A phrase of several words works well. Spaces and any characters are allowed.`;

const OBVIOUS = ["password", "qwerty", "letmein", "123456789", "abcdefgh", "buffrcheckpoint"];

/** Returns why a password is refused, or null when it is acceptable. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string") return "Enter a password.";
  if ([...password].length < PASSWORD_MIN_LENGTH)
    return `The password must have at least ${PASSWORD_MIN_LENGTH} characters.`;
  if ([...password].length > PASSWORD_MAX_LENGTH)
    return `The password must have at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (password.trim().length === 0) return "The password cannot be only spaces.";
  const lower = password.toLowerCase();
  if (new Set([...lower]).size < 5) return "The password repeats too few different characters. Choose a longer phrase.";
  if (OBVIOUS.some((word) => lower.replace(/[^a-z0-9]/g, "").includes(word))) {
    return "The password contains a very common word or sequence. Choose a different phrase.";
  }
  return null;
}

/** class-validator decorator: refuses a weak password with the reason as the message. */
export function MeetsPasswordPolicy(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "meetsPasswordPolicy",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => passwordProblem(value) === null,
        defaultMessage: (args) => passwordProblem(args?.value) ?? "Choose a stronger password.",
      },
    });
  };
}
