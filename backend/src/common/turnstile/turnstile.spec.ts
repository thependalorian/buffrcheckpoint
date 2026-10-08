import { BadRequestException, type ExecutionContext } from "@nestjs/common";

import { TURNSTILE_REFUSED, TurnstileGuard } from "./turnstile.guard";
import { TurnstileService } from "./turnstile.service";

const realFetch = global.fetch;
const context = (headers: Record<string, string> = {}) => ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

describe("Turnstile", () => {
  afterEach(() => {
    global.fetch = realFetch;
    process.env.TURNSTILE_SECRET_KEY = undefined as unknown as string;
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("does nothing until a secret is set", async () => {
    const service = new TurnstileService();
    expect(service.isEnabled()).toBe(false);
    expect(await service.verify(undefined)).toBe("passed");
    expect(await new TurnstileGuard(service).canActivate(context())).toBe(true);
  });

  it("sends only the secret and the token to Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-value";
    const fetchMock = jest.fn(async () => ({ status: 200, json: async () => ({ success: true }) }));
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await new TurnstileService().verify("token-1")).toBe("passed");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }];
    expect([...init.body.keys()].sort()).toEqual(["response", "secret"]);
  });

  it("refuses a missing token and a token Cloudflare rejects", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-value";
    global.fetch = jest.fn(async () => ({ status: 200, json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }) })) as unknown as typeof fetch;
    const service = new TurnstileService();
    expect(await service.verify(undefined)).toBe("failed");
    expect(await service.verify("bad")).toBe("failed");
    const guard = new TurnstileGuard(service);
    await expect(guard.canActivate(context({ "x-turnstile-token": "bad" }))).rejects.toThrow(new BadRequestException(TURNSTILE_REFUSED));
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lets a request through, with a warning, when Cloudflare cannot be reached or errors", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-value";
    const service = new TurnstileService();
    global.fetch = jest.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    expect(await service.verify("token")).toBe("unavailable");
    global.fetch = jest.fn(async () => ({ status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await service.verify("token")).toBe("unavailable");
    expect(await new TurnstileGuard(service).canActivate(context({ "x-turnstile-token": "token" }))).toBe(true);
  });
});
