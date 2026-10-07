import { verifySurveyToken } from "../../modules/visit-survey/survey-token";
import { buildCompactSurveyUrl } from "../../modules/visit-survey/survey-url";
import { buildCompactSignOutUrl, verifySignOutToken } from "../../modules/visits/sign-out-token";
import { COMPACT_TOKEN_LENGTH, createCompactToken, verifyCompactToken } from "./compact-link-token";

const VISIT = "3f2b8c1e-9a4d-4e7b-8c55-0d1f2a3b4c5d";
const HOUR = 3_600_000;

describe("compact link token", () => {
  beforeAll(() => {
    process.env.QR_TOKEN_PEPPER = "test-qr-pepper";
  });

  it("is 41 characters and round-trips the visit and kind", () => {
    const now = Date.now();
    const token = createCompactToken("o", VISIT, now + HOUR);
    expect(token).toHaveLength(COMPACT_TOKEN_LENGTH);
    expect(COMPACT_TOKEN_LENGTH).toBe(41);
    expect(verifyCompactToken(token, now)).toEqual({ kind: "o", visitId: VISIT });
  });

  it("rejects expiry, tampering and the wrong length", () => {
    const now = Date.now();
    const token = createCompactToken("o", VISIT, now + HOUR);
    expect(verifyCompactToken(token, now + 2 * HOUR)).toBeNull();
    const flipped = `${token.slice(0, 10)}${token[10] === "A" ? "B" : "A"}${token.slice(11)}`;
    expect(verifyCompactToken(flipped, now)).toBeNull();
    expect(verifyCompactToken(token.slice(0, -1), now)).toBeNull();
    expect(verifyCompactToken(`${token}x`, now)).toBeNull();
  });

  it("never accepts a sign-out token as a rating token or the reverse", () => {
    const now = Date.now();
    const signOut = createCompactToken("o", VISIT, now + HOUR);
    const rating = createCompactToken("r", VISIT, now + HOUR);
    expect(verifySurveyToken(signOut, now)).toBeNull();
    expect(verifySignOutToken(rating, now)).toBeNull();
    expect(verifySignOutToken(signOut, now)).toBe(VISIT);
    expect(verifySurveyToken(rating, now)).toEqual({ visitId: VISIT, channel: "qr" });
  });

  it("produces links short enough to share a text message with wording", () => {
    const signOut = buildCompactSignOutUrl(VISIT);
    const rating = buildCompactSurveyUrl(VISIT);
    expect(signOut.length).toBeLessThanOrEqual(75);
    expect(rating.length).toBeLessThanOrEqual(75);
    expect(signOut).toMatch(/\/o\/[A-Za-z0-9_-]{41}$/);
    expect(rating).toMatch(/\/r\/[A-Za-z0-9_-]{41}$/);
  });

  it("refuses a visit id that is not a UUID", () => {
    expect(() => createCompactToken("o", "not-a-uuid", Date.now())).toThrow();
  });
});
