import { JwtService } from "@nestjs/jwt";

import { AdumoService, adumoAmount, adumoConfigFromEnv } from "./adumo.service";

const ENV = {
  ADUMO_MERCHANT_ID: "11111111-AAAA-4AAA-8AAA-111111111111",
  ADUMO_APPLICATION_ID: "22222222-BBBB-4BBB-8BBB-222222222222",
  ADUMO_JWT_SECRET: "unit-test-secret-not-a-real-key-123456",
  ADUMO_BASE_URL: "https://staging-apiv3.adumoonline.com",
  PUBLIC_ADMIN_BASE_URL: "https://admin.example.test",
};

const signer = new JwtService();
const now = () => Math.floor(Date.now() / 1000);

function responseToken(overrides: Record<string, unknown> = {}, secret = ENV.ADUMO_JWT_SECRET) {
  return signer.sign(
    {
      cuid: ENV.ADUMO_MERCHANT_ID.toLowerCase(),
      auid: ENV.ADUMO_APPLICATION_ID,
      result: 0,
      transactionIndex: "5bb926df-68ed-4154-bf01-cd1e7f2278a5",
      mref: "payment-1",
      amount: "1500.00",
      iat: now() - 10,
      exp: now() + 600,
      ...overrides,
    },
    { secret, algorithm: "HS256", noTimestamp: true },
  );
}

describe("AdumoService", () => {
  const saved = { ...process.env };
  beforeEach(() => Object.assign(process.env, ENV));
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is not configured without credentials", () => {
    expect(adumoConfigFromEnv({})).toBeNull();
    expect(adumoAmount("1500")).toBe("1500.00");
  });

  it("builds a signed checkout with server amount, reference and return URL", () => {
    const checkout = new AdumoService().buildCheckout("payment-1", "1500", "Invoice INV-1");
    expect(checkout.actionUrl).toBe("https://staging-apiv3.adumoonline.com/product/payment/v1/initialisevirtual");
    expect(checkout.fields.Amount).toBe("1500.00");
    expect(checkout.fields.MerchantReference).toBe("payment-1");
    expect(checkout.fields.RedirectSuccessfulURL).toBe("https://admin.example.test/api/billing/card-payment/return");
    const claims = signer.verify<Record<string, unknown>>(checkout.fields.Token, { secret: ENV.ADUMO_JWT_SECRET });
    expect(claims).toMatchObject({ mref: "payment-1", amount: "1500.00", cuid: ENV.ADUMO_MERCHANT_ID });
    expect(Number(claims.exp) - Number(claims.iat)).toBe(660);
  });

  it("accepts a correctly signed response token for our merchant", () => {
    const claims = new AdumoService().verifyResponseToken(responseToken());
    expect(claims).toMatchObject({ result: 0, mref: "payment-1", amount: "1500.00" });
  });

  it("rejects a token signed with another secret, an expired token, or another merchant", () => {
    const service = new AdumoService();
    expect(() => service.verifyResponseToken(responseToken({}, "attacker-secret-xxxxxxxxxxxxxxxxxx"))).toThrow(
      "Invalid payment response token",
    );
    expect(() => service.verifyResponseToken(responseToken({ exp: now() - 5 }))).toThrow(
      "Invalid payment response token",
    );
    expect(() => service.verifyResponseToken(responseToken({ cuid: "someone-else" }))).toThrow("different merchant");
    expect(() => service.verifyResponseToken(undefined)).toThrow("Missing payment response token");
  });
});
