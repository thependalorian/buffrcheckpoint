import { ServiceUnavailableException } from "@nestjs/common";

import { FORM_AI_MAX_TOKENS, FormAiService } from "./form-ai.service";

describe("FormAiService", () => {
  const service = new FormAiService();

  it("reports disabled when env flags are unset", () => {
    const prevEnabled = process.env.FORM_AI_ENABLED;
    const prevUrl = process.env.NEON_AI_GATEWAY_BASE_URL;
    const prevKey = process.env.NEON_AI_GATEWAY_API_KEY;
    delete process.env.FORM_AI_ENABLED;
    delete process.env.NEON_AI_GATEWAY_BASE_URL;
    delete process.env.NEON_AI_GATEWAY_API_KEY;
    expect(service.isEnabled()).toBe(false);
    if (prevEnabled === undefined) delete process.env.FORM_AI_ENABLED;
    else process.env.FORM_AI_ENABLED = prevEnabled;
    if (prevUrl === undefined) delete process.env.NEON_AI_GATEWAY_BASE_URL;
    else process.env.NEON_AI_GATEWAY_BASE_URL = prevUrl;
    if (prevKey === undefined) delete process.env.NEON_AI_GATEWAY_API_KEY;
    else process.env.NEON_AI_GATEWAY_API_KEY = prevKey;
  });

  it("rejects suggestFields when disabled", async () => {
    await expect(
      service.suggestFields({
        visitorTypeCode: "general",
        intentText: "Need company and vehicle registration",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  describe("request shape (AI-1, AIG-11, AIG-17)", () => {
    const keys = ["FORM_AI_ENABLED", "NEON_AI_GATEWAY_BASE_URL", "NEON_AI_GATEWAY_API_KEY"] as const;
    const saved: Record<string, string | undefined> = {};
    let sent: Record<string, unknown> | null = null;

    beforeEach(() => {
      for (const k of keys) saved[k] = process.env[k];
      process.env.FORM_AI_ENABLED = "true";
      process.env.NEON_AI_GATEWAY_BASE_URL = "https://gateway.invalid/v1";
      process.env.NEON_AI_GATEWAY_API_KEY = "test-key-not-real";
      sent = null;
      jest.spyOn(global, "fetch").mockImplementation(async (_url, init) => {
        sent = JSON.parse(String((init as RequestInit).body));
        return new Response(
          JSON.stringify({ choices: [{ message: { content: '{"fieldLabel":"Nom","helpText":null}' } }] }),
          {
            status: 200,
          },
        );
      });
    });

    afterEach(() => {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
      jest.restoreAllMocks();
    });

    it("sends no tools, functions or tool choice, and caps the completion length", async () => {
      await service.translateField({ languageCode: "fr", fieldLabel: "Name" });
      expect(sent).not.toBeNull();
      for (const forbidden of ["tools", "functions", "tool_choice", "function_call"]) {
        expect(Object.keys(sent ?? {})).not.toContain(forbidden);
      }
      expect(sent?.max_tokens).toBe(FORM_AI_MAX_TOKENS);
    });

    it("sends only the form label and help text, never a visitor field", async () => {
      await service.translateField({ languageCode: "fr", fieldLabel: "Name", helpText: "As on your ID" });
      const messages = (sent?.messages ?? []) as Array<{ role: string; content: string }>;
      expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
      expect(JSON.parse(messages[1].content)).toEqual({ fieldLabel: "Name", helpText: "As on your ID" });
    });
  });
});
