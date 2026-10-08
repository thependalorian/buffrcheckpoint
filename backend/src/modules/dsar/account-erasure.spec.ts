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

describe("account closure wording", () => {
  it("states what was kept and never claims that everything was deleted", () => {
    const { ACCOUNT_CLOSED_NOTICE } = jest.requireActual("./dsar.service") as typeof import("./dsar.service");
    expect(ACCOUNT_CLOSED_NOTICE.body).toContain("keep only the records we are required or justified to keep");
    expect(ACCOUNT_CLOSED_NOTICE.body.toLowerCase()).not.toContain("everything");
  });

  it("names the placeholder an erased account carries", () => {
    const { erasedEmail } = jest.requireActual("./dsar.service") as typeof import("./dsar.service");
    expect(erasedEmail("11111111-1111-1111-1111-111111111111")).toBe("erased-11111111-1111-1111-1111-111111111111@erased.invalid");
  });
});
