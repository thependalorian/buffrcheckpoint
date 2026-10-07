const verify = jest.fn();
const close = jest.fn();
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: () => ({ verify, close }) } }));

import { IntegrationHealthService } from "./integration-health.service";

const service = () => new IntegrationHealthService({} as never, {} as never);
const probe = () =>
  (service() as unknown as { email(): Promise<{ name: string; status: string; detail: string }> }).email();

describe("email health probe", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    verify.mockReset();
    close.mockReset();
  });

  it("reports the Buffr mailbox healthy when the SMTP sign-in works, without naming a password", async () => {
    process.env.SMTP_USER = "hello@buffr.ai";
    process.env.SMTP_PASS = "s3cret-pass";
    delete process.env.EMAIL_TRANSPORT;
    verify.mockResolvedValue(true);
    const result = await probe();
    expect(result.status).toBe("healthy");
    expect(result.name).toContain("Buffr mailbox");
    expect(result.detail).toContain("hello@buffr.ai");
    expect(result.detail).not.toContain("s3cret-pass");
    expect(close).toHaveBeenCalled();
  });

  it("reports down, with the password scrubbed, when the mailbox rejects the sign-in", async () => {
    process.env.SMTP_USER = "hello@buffr.ai";
    process.env.SMTP_PASS = "s3cret-pass";
    verify.mockRejectedValue(new Error("535 Authentication failed for s3cret-pass"));
    const result = await probe();
    expect(result.status).toBe("down");
    expect(result.detail).toContain("535");
    expect(result.detail).not.toContain("s3cret-pass");
  });

  it("says not configured when there is no transport at all", async () => {
    for (const key of ["SMTP_USER", "SMTP_PASS", "RESEND_API_KEY", "EMAIL_TRANSPORT"]) delete process.env[key];
    expect((await probe()).status).toBe("not_configured");
  });
});
