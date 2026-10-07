import { cleanName, composePlainText, greetingLine, hasGreeting, signatureFor, signatureText } from "./email-compose";

describe("email personalisation and signature", () => {
  it("greets by name when known, plainly when not", () => {
    expect(greetingLine("Maria Nghipandulwa")).toBe("Hello Maria Nghipandulwa,");
    expect(greetingLine(null)).toBe("Hello,");
    expect(greetingLine("   ")).toBe("Hello,");
  });

  it("never puts an email address, markup or a line break into a greeting", () => {
    expect(cleanName("maria@firm.example")).toBeNull();
    expect(cleanName("Maria\r\nBcc: x@y.example")).toBeNull(); // a smuggled address makes the whole name unusable
    expect(cleanName("Maria\r\nNghipandulwa")).toBe("Maria Nghipandulwa");
    expect(cleanName("<script>Maria</script>")).toBe("script Maria /script");
    expect(cleanName("a".repeat(200))?.length).toBe(60);
  });

  it("signs as the team by default, as billing or support when the template says so, and not at all for internal mail", () => {
    expect(signatureFor(undefined)).toEqual({ name: "The Buffr Checkpoint team" });
    expect(signatureFor("billing")).toEqual({ name: "Buffr Checkpoint Billing", role: "Accounts" });
    expect(signatureFor("support")?.name).toBe("Buffr Checkpoint Support");
    expect(signatureFor("none")).toBeNull();
  });

  it("puts greeting, body and signature in the plain text, without repeating contact details that the footer already carries", () => {
    const text = composePlainText({
      greeting: "Hello Maria,",
      body: "Your invoice is ready.\n",
      signature: signatureFor("billing"),
    });
    expect(text).toBe("Hello Maria,\n\nYour invoice is ready.\n\nKind regards,\nBuffr Checkpoint Billing, Accounts\n");
    expect(signatureText(null)).toBe("");
    expect(composePlainText({ greeting: null, body: "Alert.", signature: null })).toBe("Alert.\n");
  });

  it("does not greet twice when the body already opens with a greeting", () => {
    expect(hasGreeting("Hi Maria,\n\nThanks.")).toBe(true);
    expect(hasGreeting("Dear customer")).toBe(true);
    expect(hasGreeting("Your invoice is ready.")).toBe(false);
    expect(hasGreeting("Highlights this week")).toBe(false);
  });
});
