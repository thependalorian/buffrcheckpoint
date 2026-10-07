import { NotificationPreferencesService, preferencesKey, switchableCodes } from "./notification-preferences.service";

const user = { userId: "u1", organisationId: "org-1" } as never;

function makeService(initial: { disabled?: string[] } | null = null) {
  let stored = initial;
  const writes: Array<{ key: string; value: unknown }> = [];
  const config = {
    getSetting: jest.fn(async () => stored),
    setSetting: jest.fn(async (key: string, value: unknown) => {
      stored = value as { disabled: string[] };
      writes.push({ key, value });
    }),
  };
  return { service: new NotificationPreferencesService(config as never), writes };
}

describe("NotificationPreferencesService", () => {
  it("offers only optional visitor mail: never security, billing or verification, and not the reports that have their own settings", () => {
    const codes = switchableCodes();
    expect(codes).toEqual(
      expect.arrayContaining(["visitor_prereg_invite", "visitor_visit_receipt", "visitor_signout_thanks"]),
    );
    for (const never of [
      "password_reset",
      "email_verification",
      "invoice_issued",
      "kyb_verified",
      "scheduled_site_manager_digest",
    ]) {
      expect(codes).not.toContain(never);
    }
  });

  it("is on by default and always on for mail that cannot be switched off", async () => {
    const { service } = makeService();
    expect(await service.isEnabled("org-1", "visitor_visit_receipt")).toBe(true);
    const off = makeService({ disabled: ["password_reset"] }); // even a forged row cannot silence security mail
    expect(await off.service.isEnabled("org-1", "password_reset")).toBe(true);
  });

  it("switches an optional email off and back on, writing under the organisation's own key", async () => {
    const { service, writes } = makeService();
    await service.update("org-1", [{ templateCode: "visitor_visit_receipt", enabled: false }], user);
    expect(writes[0]).toEqual({ key: preferencesKey("org-1"), value: { disabled: ["visitor_visit_receipt"] } });
    expect(await service.isEnabled("org-1", "visitor_visit_receipt")).toBe(false);
    expect(await service.isEnabled("org-1", "visitor_signout_thanks")).toBe(true);
    await service.update("org-1", [{ templateCode: "visitor_visit_receipt", enabled: true }], user);
    expect(await service.isEnabled("org-1", "visitor_visit_receipt")).toBe(true);
  });

  it("refuses to switch off mail that is always sent, and unknown codes", async () => {
    const { service, writes } = makeService();
    await expect(service.update("org-1", [{ templateCode: "password_reset", enabled: false }], user)).rejects.toThrow(
      /always sent/,
    );
    await expect(service.update("org-1", [{ templateCode: "nonsense", enabled: false }], user)).rejects.toThrow();
    expect(writes).toHaveLength(0);
  });

  it("lists each optional email with its state", async () => {
    const { service } = makeService({ disabled: ["visitor_signout_thanks"] });
    const rows = await service.list("org-1");
    expect(rows.find((r) => r.templateCode === "visitor_signout_thanks")?.enabled).toBe(false);
    expect(rows.find((r) => r.templateCode === "visitor_visit_receipt")?.enabled).toBe(true);
  });
});
