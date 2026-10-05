import { describe, expect, it } from "vitest";

import { apiError, runAction, unwrap } from "./result";

describe("action results", () => {
  it("extracts code and message from an API error body", () => {
    const err = new Error(
      'API error 413 on /site-branding/assets: {"code":"LOGO_TOO_LARGE","message":"Logo must be under 400 KB."}',
    );
    expect(apiError(err, "fallback")).toEqual({ code: "LOGO_TOO_LARGE", message: "Logo must be under 400 KB." });
  });

  it("reads nested Nest error messages and falls back to the HTTP status code", () => {
    const err = new Error('API error 400 on /x: {"message":{"message":"Site not found"},"statusCode":400}');
    expect(apiError(err, "fallback")).toEqual({ code: "HTTP_400", message: "Site not found" });
    expect(apiError(new Error("API error 502 on /x: <html>"), "Could not save.")).toEqual({
      code: "HTTP_502",
      message: "Could not save.",
    });
  });

  it("never throws from runAction and unwrap rethrows the message", async () => {
    const result = await runAction("Could not save.", async () => {
      throw new Error('API error 409 on /x: {"message":"Already exists"}');
    });
    expect(result).toEqual({ ok: false, code: "HTTP_409", message: "Already exists" });
    expect(() => unwrap(result)).toThrow("Already exists");
  });
});
