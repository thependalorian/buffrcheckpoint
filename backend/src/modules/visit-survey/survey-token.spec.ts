import { createSurveyToken, verifySurveyToken } from "./survey-token";

describe("survey token", () => {
  const visitId = "0b6f6a52-3c1f-4b5e-9a57-2f7d8e1c9a10";
  beforeAll(() => {
    process.env.QR_TOKEN_PEPPER = "test-pepper";
  });

  it("round-trips a visit id", () => {
    expect(verifySurveyToken(createSurveyToken(visitId, "kiosk"))).toEqual({ visitId, channel: "kiosk" });
  });

  it("rejects a tampered token", () => {
    const token = createSurveyToken(visitId, "qr");
    const other = Buffer.from(`11111111-1111-1111-1111-111111111111.${Date.now() + 1000}`).toString("base64url");
    expect(verifySurveyToken(`${other}.${token.split(".")[1]}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSurveyToken(visitId, "qr", Date.now() - 25 * 60 * 60 * 1000);
    expect(verifySurveyToken(token)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifySurveyToken("not-a-token")).toBeNull();
  });
});
