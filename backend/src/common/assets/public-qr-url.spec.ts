import { buildDeviceSupportUrl, buildPublicQrUrl, isPublicQrType } from "./public-asset-url";

describe("QR payload URLs", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("maps each public QR type to its own page, with the site and reference and nothing personal", () => {
    process.env.VISITOR_CHECKIN_BASE_URL = "https://buffrcheckpoint.com/";
    expect(buildPublicQrUrl("public_site_checkin", "s1", "r1")).toBe(
      "https://buffrcheckpoint.com/check-in?site=s1&ref=r1",
    );
    expect(buildPublicQrUrl("emergency_info", "s1", "r1")).toBe("https://buffrcheckpoint.com/emergency?site=s1&ref=r1");
    expect(buildPublicQrUrl("contractor_induction", "s1", "r1")).toBe(
      "https://buffrcheckpoint.com/induction?site=s1&ref=r1",
    );
  });

  it("refuses a type that has no public page", () => {
    expect(isPublicQrType("device_support")).toBe(false);
    expect(isPublicQrType("sign_out")).toBe(false);
    expect(() => buildPublicQrUrl("device_support", "s1", "r1")).toThrow(/no public page/);
  });

  it("sends a device support QR to the admin app, behind sign-in", () => {
    process.env.PUBLIC_ADMIN_BASE_URL = "https://admin.buffrcheckpoint.com/";
    expect(buildDeviceSupportUrl("d1")).toBe("https://admin.buffrcheckpoint.com/dashboard/devices/d1");
  });
});
