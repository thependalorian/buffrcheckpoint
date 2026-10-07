import {
  createEmailAdapter,
  FallbackEmailAdapter,
  type NotificationChannelAdapter,
  ResendEmailAdapter,
  UnconfiguredEmailAdapter,
} from "./email.adapter";
import { EmailBudgetExhaustedError, SmtpEmailAdapter } from "./smtp-email.adapter";

const smtpEnv = { SMTP_USER: "team@buffranalytics.com", SMTP_PASS: "not-a-real-password" };
const resendEnv = { RESEND_API_KEY: "re_test_key" };

describe("createEmailAdapter", () => {
  it("refuses to pretend when nothing is configured", () => {
    expect(createEmailAdapter({})).toBeInstanceOf(UnconfiguredEmailAdapter);
  });

  it("uses the one configured transport on its own", () => {
    expect(createEmailAdapter(smtpEnv)).toBeInstanceOf(SmtpEmailAdapter);
    expect(createEmailAdapter(resendEnv)).toBeInstanceOf(ResendEmailAdapter);
  });

  it("prefers SMTP but keeps Resend live behind it, so one dead transport cannot take all mail down", () => {
    const adapter = createEmailAdapter({ ...smtpEnv, ...resendEnv });
    expect(adapter).toBeInstanceOf(FallbackEmailAdapter);
    const fallback = adapter as FallbackEmailAdapter;
    expect(fallback.primary).toBeInstanceOf(SmtpEmailAdapter);
    expect(fallback.secondary).toBeInstanceOf(ResendEmailAdapter);

    const resendFirst = createEmailAdapter({
      ...smtpEnv,
      ...resendEnv,
      EMAIL_TRANSPORT: "resend",
    }) as FallbackEmailAdapter;
    expect(resendFirst.primary).toBeInstanceOf(ResendEmailAdapter);
    expect(resendFirst.secondary).toBeInstanceOf(SmtpEmailAdapter);
  });

  it("never throws at construction when the chosen transport is half-configured", () => {
    // EMAIL_TRANSPORT=smtp with no credentials used to blow up while building the service — and take the app with it.
    expect(() => createEmailAdapter({ EMAIL_TRANSPORT: "smtp" })).not.toThrow();
    expect(createEmailAdapter({ EMAIL_TRANSPORT: "smtp" })).toBeInstanceOf(UnconfiguredEmailAdapter);
    expect(createEmailAdapter({ EMAIL_TRANSPORT: "smtp", ...resendEnv })).toBeInstanceOf(ResendEmailAdapter);
    expect(createEmailAdapter({ EMAIL_TRANSPORT: "smtp", SMTP_USER: "nope", ...resendEnv })).toBeInstanceOf(
      ResendEmailAdapter,
    );
    expect(createEmailAdapter({ EMAIL_TRANSPORT: "none", ...smtpEnv, ...resendEnv })).toBeInstanceOf(
      UnconfiguredEmailAdapter,
    );
  });
});

describe("FallbackEmailAdapter", () => {
  const adapter = (send: jest.Mock, hasRoom?: () => boolean) => {
    const value = { send } as unknown as NotificationChannelAdapter;
    if (hasRoom) Object.assign(value, { hasRoom });
    return value;
  };

  it("sends through the primary while it works and does not touch the fallback", async () => {
    const primary = adapter(jest.fn().mockResolvedValue({ delivered: true, providerReference: "smtp-1" }));
    const secondary = adapter(jest.fn().mockResolvedValue({ delivered: true, providerReference: "resend-1" }));
    await expect(new FallbackEmailAdapter(primary, secondary).send("a@b.example", "hi")).resolves.toEqual({
      delivered: true,
      providerReference: "smtp-1",
    });
    expect(primary.send).toHaveBeenCalledTimes(1);
    expect(secondary.send).not.toHaveBeenCalled();
  });

  it("falls back when the primary transport errors, so a dead mailbox still sends the mail", async () => {
    const primary = adapter(jest.fn().mockRejectedValue(new Error("Connection timeout")));
    const secondary = adapter(jest.fn().mockResolvedValue({ delivered: true, providerReference: "resend-1" }));
    await expect(new FallbackEmailAdapter(primary, secondary).send("a@b.example", "hi")).resolves.toEqual({
      delivered: true,
      providerReference: "resend-1",
    });
  });

  it("reports the first transport's error when both fail", async () => {
    const primary = adapter(jest.fn().mockRejectedValue(new Error("Connection timeout")));
    const secondary = adapter(jest.fn().mockRejectedValue(new Error("Resend delivery failed (500)")));
    await expect(new FallbackEmailAdapter(primary, secondary).send("a@b.example", "hi")).rejects.toThrow(
      "Connection timeout",
    );
  });

  it("treats an exhausted mailbox budget as waiting, not failing, and lets the other transport take the message", async () => {
    const primary = adapter(jest.fn().mockRejectedValue(new EmailBudgetExhaustedError()), () => false);
    const secondary = adapter(jest.fn().mockResolvedValue({ delivered: true, providerReference: "resend-1" }));
    await expect(new FallbackEmailAdapter(primary, secondary).send("a@b.example", "hi")).resolves.toEqual({
      delivered: true,
      providerReference: "resend-1",
    });
  });

  it("still reports budget exhaustion when no transport has room, so the message stays queued", async () => {
    const primary = adapter(jest.fn().mockRejectedValue(new EmailBudgetExhaustedError()), () => false);
    const secondary = adapter(jest.fn().mockRejectedValue(new EmailBudgetExhaustedError()), () => false);
    await expect(new FallbackEmailAdapter(primary, secondary).send("a@b.example", "hi")).rejects.toBeInstanceOf(
      EmailBudgetExhaustedError,
    );
  });

  it("has room while any transport still does", () => {
    const empty = adapter(jest.fn(), () => false);
    const roomy = adapter(jest.fn(), () => true);
    const unbudgeted = adapter(jest.fn());
    expect(new FallbackEmailAdapter(empty, empty).hasRoom()).toBe(false);
    expect(new FallbackEmailAdapter(empty, roomy).hasRoom()).toBe(true);
    expect(new FallbackEmailAdapter(empty, unbudgeted).hasRoom()).toBe(true);
  });
});
