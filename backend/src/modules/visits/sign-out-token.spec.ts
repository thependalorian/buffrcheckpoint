import { createSurveyToken } from "../visit-survey/survey-token";
import { buildSignOutUrl, createSignOutToken, verifySignOutToken } from "./sign-out-token";

describe("sign-out token", () => {
  beforeAll(() => {
    process.env.QR_TOKEN_PEPPER = "test-pepper";
  });
  const visitId = "3f2a9c1e-1111-4222-8333-444455556666";

  it("round-trips the visit id", () => {
    expect(verifySignOutToken(createSignOutToken(visitId))).toBe(visitId);
  });

  it("rejects an expired, forged or malformed token", () => {
    const old = createSignOutToken(visitId, Date.now() - 25 * 60 * 60 * 1000);
    expect(verifySignOutToken(old)).toBeNull();
    const token = createSignOutToken(visitId);
    const [encoded, signature] = token.split(".");
    const forgedPayload = Buffer.from(`other-visit.${Date.now() + 1000}`).toString("base64url");
    expect(verifySignOutToken(`${forgedPayload}.${signature}`)).toBeNull();
    expect(verifySignOutToken(`${encoded}.AAAA`)).toBeNull();
    expect(verifySignOutToken("garbage")).toBeNull();
    expect(verifySignOutToken(`${token}.extra`)).toBeNull();
  });

  it("does not accept a rating token as a sign-out token, or the reverse", () => {
    expect(verifySignOutToken(createSurveyToken(visitId, "qr"))).toBeNull();
  });

  it("builds a link on the visitor site", () => {
    expect(buildSignOutUrl(visitId)).toMatch(/^https:\/\/buffrcheckpoint\.com\/check-out\?v=/);
  });
});
