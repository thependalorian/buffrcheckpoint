import {
  buildInvitationCheckInUrl,
  generateOpaqueInvitationToken,
  invitationTokenHmac,
} from "./invitation-token.util";

describe("invitation-token.util", () => {
  it("generates opaque tokens without PII", () => {
    const token = generateOpaqueInvitationToken();
    expect(token.length).toBeGreaterThan(16);
    expect(token).not.toMatch(/\s/);
  });

  it("builds check-in URLs with inv query param only", () => {
    const url = buildInvitationCheckInUrl("abc123token");
    expect(url).toContain("/check-in?inv=");
    expect(url).not.toContain("visitor");
    expect(url).not.toContain("name");
  });

  it("produces stable HMAC for the same token", () => {
    process.env.QR_TOKEN_PEPPER = "test-pepper";
    const a = invitationTokenHmac("same-token");
    const b = invitationTokenHmac("same-token");
    expect(a).toBe(b);
  });
});
