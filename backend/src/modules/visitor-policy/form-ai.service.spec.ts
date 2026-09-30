import { ServiceUnavailableException } from "@nestjs/common";

import { FormAiService } from "./form-ai.service";

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
});
