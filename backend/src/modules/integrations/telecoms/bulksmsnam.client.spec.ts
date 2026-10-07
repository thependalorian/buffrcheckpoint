import { BulkSmsNamClient, normaliseNamibianMobile, SMS_MAX_CHARACTERS, SmsSendError } from "./bulksmsnam.client";

function fakeFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("normaliseNamibianMobile", () => {
  it.each([
    ["+264814376206", "+264814376206"],
    ["+264 81 437 6206", "+264814376206"],
    ["264814376206", "+264814376206"],
    ["0814376206", "+264814376206"],
    ["00264814376206", "+264814376206"],
    ["+264 85 123 4567", "+264851234567"],
  ])("accepts %s", (input, expected) => expect(normaliseNamibianMobile(input)).toBe(expected));

  it.each(["", "abc", "+27821234567", "+26461234567", "081437620", "08143762061", "+264 64 123 4567"])(
    "rejects %s",
    (input) => expect(normaliseNamibianMobile(input)).toBeNull(),
  );
});

describe("BulkSmsNamClient", () => {
  it("is not configured without a key and never calls the network", async () => {
    const { impl } = fakeFetch(200, {});
    const client = new BulkSmsNamClient({ apiKey: "", fetchImpl: impl });
    expect(client.isConfigured()).toBe(false);
    await expect(client.send("+264814376206", "Hi")).rejects.toMatchObject({ code: "not_configured" });
    expect(impl).not.toHaveBeenCalled();
  });

  it("posts a normalised number with the key in the header only", async () => {
    const { impl, calls } = fakeFetch(200, {
      success: true,
      messageId: "ATXid_1",
      to: "+264814376206",
      creditsUsed: 1,
      creditsRemaining: 9,
    });
    const client = new BulkSmsNamClient({
      apiKey: "bsn_secret",
      baseUrl: "https://example.test/api/v1/",
      fetchImpl: impl,
    });
    const result = await client.send("0814376206", "Your host is ready");
    expect(result).toEqual({ delivered: true, providerReference: "ATXid_1", creditsRemaining: 9 });
    expect(calls[0].url).toBe("https://example.test/api/v1/send");
    expect((calls[0].init.headers as Record<string, string>)["X-API-Key"]).toBe("bsn_secret");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ to: "+264814376206", message: "Your host is ready" });
    expect(calls[0].url).not.toContain("bsn_secret");
  });

  it("refuses a bad number or an over-long message before spending a credit", async () => {
    const { impl } = fakeFetch(200, {});
    const client = new BulkSmsNamClient({ apiKey: "k", fetchImpl: impl });
    await expect(client.send("+27821234567", "Hi")).rejects.toMatchObject({ code: "invalid_recipient" });
    await expect(client.send("+264814376206", "x".repeat(SMS_MAX_CHARACTERS + 1))).rejects.toMatchObject({
      code: "message_too_long",
    });
    await expect(client.send("+264814376206", "")).rejects.toMatchObject({ code: "message_too_long" });
    expect(impl).not.toHaveBeenCalled();
  });

  it("treats an HTTP error or an error body as rejected, never as sent", async () => {
    const a = new BulkSmsNamClient({ apiKey: "k", fetchImpl: fakeFetch(402, { error: "insufficient credits" }).impl });
    await expect(a.send("+264814376206", "Hi")).rejects.toMatchObject({ code: "provider_rejected" });
    const b = new BulkSmsNamClient({ apiKey: "k", fetchImpl: fakeFetch(200, { success: false }).impl });
    await expect(b.send("+264814376206", "Hi")).rejects.toMatchObject({ code: "provider_rejected" });
  });

  it("reports an unreachable provider without leaking the key or number", async () => {
    const impl = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const client = new BulkSmsNamClient({ apiKey: "bsn_secret", fetchImpl: impl });
    const error = await client.send("+264814376206", "Hi").catch((e: SmsSendError) => e);
    expect(error).toBeInstanceOf(SmsSendError);
    expect((error as SmsSendError).code).toBe("provider_unreachable");
    expect((error as SmsSendError).message).not.toMatch(/bsn_secret|264814376206/);
  });

  it("reads the balance", async () => {
    const client = new BulkSmsNamClient({ apiKey: "k", fetchImpl: fakeFetch(200, { credits: 10 }).impl });
    await expect(client.balance()).resolves.toBe(10);
    const bad = new BulkSmsNamClient({ apiKey: "k", fetchImpl: fakeFetch(401, {}).impl });
    await expect(bad.balance()).rejects.toMatchObject({ code: "provider_rejected" });
  });
});
