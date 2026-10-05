import { Transform } from "class-transformer";

/**
 * Account emails are one identity regardless of case (0053 enforces a unique
 * index on lower(email)). Apply to every DTO field that creates or looks up
 * an account by email.
 */
export function NormaliseEmail(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value));
}
