import { createEmailAdapter, UnconfiguredEmailAdapter } from "./email.adapter";
import { SendBudget } from "./send-budget";
import { chooseTransport, smtpConfigFromEnv } from "./smtp-config";
import { cleanHeader, EmailBudgetExhaustedError, SmtpEmailAdapter } from "./smtp-email.adapter";

const env = { SMTP_USER: "hello@buffr.ai", SMTP_PASS: "not-a-real-password" };

describe("smtp config", () => {
  it("defaults to the Private Email mailbox over TLS, from hello@buffr.ai, with caps and a 60s timeout", () => {
    expect(smtpConfigFromEnv(env)).toMatchObject({
      host: "mail.privateemail.com",
      port: 465,
      secure: true,
      user: "hello@buffr.ai",
      from: "Buffr Checkpoint <hello@buffr.ai>",
      replyTo: "hello@buffr.ai",
      domain: "buffr.ai",
      timeoutMs: 60_000,
      perHour: 60,
      perDay: 300,
    });
  });

  it("explains what is wrong without echoing the password", () => {
    expect(() => smtpConfigFromEnv({ SMTP_USER: "nope", SMTP_PASS: "secret-value" })).toThrow("SMTP_USER");
    expect(() => smtpConfigFromEnv({ SMTP_USER: "a@b.example" })).toThrow("SMTP_PASS");
    try {
      smtpConfigFromEnv({ SMTP_USER: "nope", SMTP_PASS: "secret-value" });
    } catch (e) {
      expect(String(e)).not.toContain("secret-value");
    }
    expect(() => smtpConfigFromEnv({ ...env, EMAIL_FROM: "Bad <not-an-address>" })).toThrow("EMAIL_FROM");
  });

  it("ignores nonsense limits and keeps the safe defaults", () => {
    expect(smtpConfigFromEnv({ ...env, EMAIL_MAX_PER_HOUR: "banana", SMTP_TIMEOUT_MS: "5" })).toMatchObject({
      perHour: 60,
      timeoutMs: 60_000,
    });
  });

  it("picks SMTP when its credentials exist, Resend only as a fallback, otherwise none", () => {
    expect(chooseTransport(env)).toBe("smtp");
    expect(chooseTransport({ RESEND_API_KEY: "k" })).toBe("resend");
    expect(chooseTransport({ ...env, RESEND_API_KEY: "k" })).toBe("smtp");
    expect(chooseTransport({ ...env, EMAIL_TRANSPORT: "resend", RESEND_API_KEY: "k" })).toBe("resend");
    expect(chooseTransport({})).toBe("none");
    expect(createEmailAdapter({})).toBeInstanceOf(UnconfiguredEmailAdapter);
    expect(createEmailAdapter(env)).toBeInstanceOf(SmtpEmailAdapter);
  });
});

describe("SendBudget", () => {
  it("allows up to the hourly cap, then frees room as the hour passes", () => {
    let now = 0;
    const budget = new SendBudget({ perHour: 2, perDay: 10 }, () => now);
    budget.record();
    budget.record();
    expect(budget.hasRoom()).toBe(false);
    now = 3_600_001;
    expect(budget.hasRoom()).toBe(true);
  });

  it("enforces the daily cap across hours", () => {
    let now = 0;
    const budget = new SendBudget({ perHour: 100, perDay: 3 }, () => now);
    for (let i = 0; i < 3; i++) {
      budget.record();
      now += 4_000_000;
    }
    expect(budget.hasRoom()).toBe(false);
    now = 86_400_001;
    expect(budget.hasRoom()).toBe(true);
  });
});

describe("SmtpEmailAdapter", () => {
  const config = smtpConfigFromEnv(env);
  const make = (sendMail = jest.fn().mockResolvedValue({}), budget?: SendBudget) => ({
    sendMail,
    adapter: new SmtpEmailAdapter(config, { transporter: { sendMail } as never, budget }),
  });

  it("sends from the mailbox with a reply-to, plain text plus HTML, and auto-response suppression", async () => {
    const { sendMail, adapter } = make();
    const result = await adapter.send("visitor@example.com", "plain body", {
      subject: "Hello",
      html: "<p>plain body</p>",
    });
    expect(result.delivered).toBe(true);
    expect(result.providerReference).toMatch(/^<[0-9a-f-]+@buffr\.ai>$/);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Buffr Checkpoint <hello@buffr.ai>",
        to: "visitor@example.com",
        replyTo: "hello@buffr.ai",
        subject: "Hello",
        text: "plain body",
        html: "<p>plain body</p>",
        headers: expect.objectContaining({ "Auto-Submitted": "auto-generated" }),
      }),
    );
  });

  it("cannot be used to inject headers through the subject or recipient", async () => {
    const { sendMail, adapter } = make();
    await adapter.send("a@example.com", "x", { subject: "Hi\r\nBcc: attacker@evil.example" });
    expect(sendMail.mock.calls[0][0].subject).not.toMatch(/[\r\n]/);
    await expect(adapter.send("a@example.com\r\nBcc: x@y.example", "x")).rejects.toThrow("valid email address");
    expect(cleanHeader("a\u0000b\nc")).toBe("a b c");
  });

  it("attaches files from base64", async () => {
    const { sendMail, adapter } = make();
    await adapter.send("a@example.com", "x", {
      attachments: [
        { filename: "r.csv", contentBase64: Buffer.from("a,b").toString("base64"), contentType: "text/csv" },
      ],
    });
    expect(sendMail.mock.calls[0][0].attachments[0].content.toString()).toBe("a,b");
  });

  it("refuses to send once the budget is spent, and says so distinctly so the message waits", async () => {
    const budget = new SendBudget({ perHour: 1, perDay: 5 });
    const { sendMail, adapter } = make(undefined, budget);
    await adapter.send("a@example.com", "x");
    expect(adapter.hasRoom()).toBe(false);
    await expect(adapter.send("a@example.com", "x")).rejects.toBeInstanceOf(EmailBudgetExhaustedError);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("does not count a failed send against the budget", async () => {
    const { adapter } = make(jest.fn().mockRejectedValue(new Error("connection refused")));
    await expect(adapter.send("a@example.com", "x")).rejects.toThrow("connection refused");
    expect(adapter.budget.usage().lastHour).toBe(0);
  });
});
