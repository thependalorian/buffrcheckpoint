import { verifySurveyToken } from "./survey-token";
import { buildSurveyUrl } from "./survey-url";

describe("buildSurveyUrl", () => {
  const visitId = "0b6f6a52-3c1f-4b5e-9a57-2f7d8e1c9a10";
  beforeAll(() => {
    process.env.QR_TOKEN_PEPPER = "test-pepper";
  });
  afterEach(() => {
    delete process.env.PUBLIC_WEBSITE_BASE_URL;
  });

  it("points at the public rate page on the website with a token that verifies for that visit", () => {
    const url = new URL(buildSurveyUrl(visitId));
    expect(url.origin + url.pathname).toBe("https://buffrcheckpoint.com/rate");
    expect(verifySurveyToken(url.searchParams.get("t") ?? "")).toEqual({ visitId, channel: "qr" });
  });

  it("follows PUBLIC_WEBSITE_BASE_URL without a double slash", () => {
    process.env.PUBLIC_WEBSITE_BASE_URL = "https://staging.example.com/";
    expect(buildSurveyUrl(visitId).startsWith("https://staging.example.com/rate?t=")).toBe(true);
  });
});
