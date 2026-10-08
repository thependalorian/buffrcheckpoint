import { erasedUserFields } from "./dsar.service";

describe("erasedUserFields", () => {
  const now = new Date("2026-10-08T10:00:00Z");
  const fields = erasedUserFields(now);

  it("erases credential material and external identity, not just flags the row", () => {
    expect(fields.passwordHash).toBeNull();
    expect(fields.mfaSecretReference).toBeNull();
    expect(fields.buffrIdSubject).toBeNull();
    expect(fields.mfaEnabled).toBe(false);
    expect(fields.lockedUntil).toBeNull();
  });

  it("soft-deletes the row at the completion time", () => {
    expect(fields.deletedAt).toBe(now);
  });

  it("replaces the email with an expression, never a literal that could collide or receive mail", () => {
    const chunks = (fields.email as unknown as { queryChunks: Array<{ value?: string[] }> }).queryChunks;
    const literal = chunks.flatMap((chunk) => chunk.value ?? []).join("");
    expect(literal).toContain("erased-");
    expect(literal).toContain("@erased.invalid");
  });

  it("keeps the identifier columns the audit trail joins on out of the update", () => {
    expect(Object.keys(fields)).not.toContain("id");
    expect(Object.keys(fields)).not.toContain("organisationId");
  });
});
